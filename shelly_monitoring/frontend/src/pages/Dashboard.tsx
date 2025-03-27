import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, IconButton, Box, Menu, MenuItem, CircularProgress, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import BoltIcon from '@mui/icons-material/Bolt';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import RoomMatrix from '../components/RoomMatrix';
import TabManager from '../components/TabManager';
import DeviceList from '../components/DeviceList';
import { getHabitacionesByTablero, deleteTablero, deleteHabitacion, getTableros, getHabitaciones, getDispositivosByHabitacion } from '../services/api';
import { checkPermission, setAuthToken } from '../services/auth';

// Estilos de barra de desplazamiento consistentes para toda la aplicación
const scrollbarStyle = {
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: '#000', // Fondo negro
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#1ECAFF', // Color azul para el "thumb" (parte deslizable)
    borderRadius: '3px', // Bordes redondeados para el thumb
  },
  // Firefox scrollbar
  scrollbarWidth: 'thin',
  scrollbarColor: '#1ECAFF #000', // thumb y track
};

interface Habitacion {
  id: number;
  nombre: string;
  tablero_id: number;
}

interface Tablero {
  id: number;
  nombre: string;
}

interface DashboardProps {
  user: {
    permissions: string[];
    username: string;
    role: string;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [tableros, setTableros] = useState<Tablero[]>([]);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editMenuAnchorEl, setEditMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsMenuAnchorEl, setSettingsMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteType, setDeleteType] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [roomMatrixView, setRoomMatrixView] = useState<boolean>(true);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState<boolean>(false);
  const [todasHabitacionesPermitidasIds, setTodasHabitacionesPermitidasIds] = useState<number[]>([]);
  const [habitacionesConDispositivosDialogOpen, setHabitacionesConDispositivosDialogOpen] = useState<boolean>(false);
  const [habitacionesConDispositivosLista, setHabitacionesConDispositivosLista] = useState<string[]>([]);
  
  const navigate = useNavigate();

  // Usamos el campo 'role' para verificar si es admin
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    const token = localStorage.getItem('token');
    setAuthToken(token);

    const fetchTableros = async () => {
      try {
        // Primero cargamos todos los tableros
        const allTableros = await getTableros();
        
        // Para administradores, mostrar todos los tableros sin filtrar
        if (isAdmin) {
          setTableros(allTableros);
          setLoading(false);
          return;
        }
        
        // Para usuarios no-admin, filtramos los tableros basados en permisos
        // 1. Obtener todas las habitaciones a las que el usuario tiene permiso
        const habitacionesPermitidas = await getHabitaciones();
        
        // Si no hay habitaciones permitidas, no mostrar ningún tablero
        if (!habitacionesPermitidas || habitacionesPermitidas.length === 0) {
          console.log("Usuario sin habitaciones permitidas");
          setTableros([]);
          setLoading(false);
          return;
        }
        
        // 2. Crear un mapa de habitaciones permitidas por ID para búsqueda rápida
        const habitacionesPermitidasMap = new Map();
        habitacionesPermitidas.forEach((hab: Habitacion) => {
          habitacionesPermitidasMap.set(hab.id, hab);
        });
        
        // 3. Comprobar tablero por tablero cuáles tienen habitaciones permitidas
        const tablerosConPermiso = [];
        
        for (const tablero of allTableros) {
          const habitacionesTablero = await getHabitacionesByTablero(tablero.id);
          
          // Verificar si alguna habitación del tablero está en las permitidas
          const tienePermiso = habitacionesTablero.some((hab: any) => 
            habitacionesPermitidasMap.has(hab.id)
          );
          
          if (tienePermiso) {
            tablerosConPermiso.push(tablero);
          }
        }
        
        console.log("Tableros con permiso:", tablerosConPermiso.length);
        console.log("Habitaciones permitidas:", habitacionesPermitidas.length);
        
        // 4. Actualizar estado con los tableros filtrados
        setTableros(tablerosConPermiso);
        
      } catch (error) {
        console.error("Error fetching tableros:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTableros();
    
    // Cargar todas las habitaciones permitidas al iniciar
    const fetchTodasHabitacionesPermitidas = async () => {
      try {
        if (isAdmin) {
          // Para administradores, obtener todas las habitaciones de todos los tableros
          const allTableros = await getTableros();
          let allHabitaciones: Habitacion[] = [];
          
          // Recopilamos todas las habitaciones de todos los tableros
          for (const tablero of allTableros) {
            const habitacionesTablero = await getHabitacionesByTablero(tablero.id);
            allHabitaciones = [...allHabitaciones, ...habitacionesTablero];
          }
          
          // Eliminar duplicados y obtener solo los IDs
          const habitacionesIds = Array.from(new Set(allHabitaciones.map(hab => hab.id)));
          console.log("Admin: Cargadas todas las habitaciones:", habitacionesIds.length);
          setTodasHabitacionesPermitidasIds(habitacionesIds);
        } else {
          // Para usuarios normales, solo las habitaciones permitidas
          const habitacionesPermitidas = await getHabitaciones();
          const habitacionesIds = habitacionesPermitidas.map((hab: Habitacion) => hab.id);
          console.log("Usuario: Cargadas habitaciones permitidas:", habitacionesIds.length);
          setTodasHabitacionesPermitidasIds(habitacionesIds);
        }
      } catch (error) {
        console.error("Error fetching todas las habitaciones permitidas:", error);
      }
    };

    fetchTodasHabitacionesPermitidas();
  }, [isAdmin]); // Solo se ejecuta una vez al cargar y cuando cambia isAdmin

  useEffect(() => {
    const fetchHabitacionesPermitidas = async () => {
      try {
        // Verificar que exista un tablero seleccionado
        if (!tableros || tableros.length === 0 || selectedTab >= tableros.length) {
          setHabitaciones([]);
          return;
        }
        
        const tableroId = tableros[selectedTab].id;
        console.log(`Fetching habitaciones for tablero ${tableroId}...`);
        
        const habitacionesTablero = await getHabitacionesByTablero(tableroId);
        
        // Para administradores, mostrar todas las habitaciones del tablero
        if (isAdmin) {
          console.log(`Admin user: showing all ${habitacionesTablero.length} habitaciones`);
          setHabitaciones(habitacionesTablero);
          return;
        }
        
        // Para usuarios normales, filtrar por permisos
        const habitacionesPermitidas = await getHabitaciones();
        const habitacionesFiltradas = habitacionesTablero.filter((hab: Habitacion) => 
          habitacionesPermitidas.some((perm: Habitacion) => perm.id === hab.id)
        );
        
        console.log(`Regular user: showing ${habitacionesFiltradas.length} of ${habitacionesTablero.length} habitaciones`);
        setHabitaciones(habitacionesFiltradas);
        
      } catch (error) {
        console.error("Error fetching habitaciones:", error);
        setHabitaciones([]);
      }
    };

    fetchHabitacionesPermitidas();
  }, [selectedTab, tableros, isAdmin]); // Ejecutar cuando cambia selectedTab, tableros o isAdmin

  const handleDeleteSelectionChange = (id: number) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((itemId) => itemId !== id)
        : [...prevSelected, id]
    );
  };

  const handleDeleteOptionSelect = (type: string) => {
    setDeleteType(type);
    setDeleteMode(true);
    setAnchorEl(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleEditMode = (event: React.MouseEvent<HTMLButtonElement>) => {
    setEditMode(!editMode);
  };

  const handleEditMenuClose = () => {
    setEditMenuAnchorEl(null);
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    navigate('/settings');
  };

  const handleSettingsMenuClose = () => {
    setSettingsMenuAnchorEl(null);
  };

  const handleDeleteAction = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (deleteMode) {
      try {
        if (deleteType === 'Habitación') {
          // Primero verificar si las habitaciones seleccionadas tienen dispositivos
          const habitacionesConDispositivos = [];
          for (const id of selectedItems) {
            const dispositivos = await getDispositivosByHabitacion(id);
            if (dispositivos && dispositivos.length > 0) {
              // Guarda las habitaciones que tienen dispositivos
              const habitacion = habitaciones.find(h => h.id === id);
              if (habitacion) {
                habitacionesConDispositivos.push(habitacion.nombre);
              }
            }
          }
          
          if (habitacionesConDispositivos.length > 0) {
            // Mostrar diálogo de error si hay habitaciones con dispositivos
            setHabitacionesConDispositivosDialogOpen(true);
            setHabitacionesConDispositivosLista(habitacionesConDispositivos);
            return;
          }
          
          for (const id of selectedItems) {
            await deleteHabitacion(id);
          }
          const newHabitaciones = habitaciones.filter(hab => !selectedItems.includes(hab.id));
          setHabitaciones(newHabitaciones);
          setSelectedItems([]);
          setDeleteMode(false);
          
          // Actualizar la lista de todas las habitaciones permitidas
          const fetchActualizarHabitaciones = async () => {
            if (isAdmin) {
              // Para administradores, recargamos todas las habitaciones
              const allTableros = await getTableros();
              let allHabitaciones: Habitacion[] = [];
              
              for (const tablero of allTableros) {
                const habitacionesTablero = await getHabitacionesByTablero(tablero.id);
                allHabitaciones = [...allHabitaciones, ...habitacionesTablero];
              }
              
              const habitacionesIds = Array.from(new Set(allHabitaciones.map(hab => hab.id)));
              setTodasHabitacionesPermitidasIds(habitacionesIds);
            } else {
              // Para usuarios normales, solo las habitaciones permitidas
              const habitacionesPermitidas = await getHabitaciones();
              const habitacionesIds = habitacionesPermitidas.map((hab: Habitacion) => hab.id);
              setTodasHabitacionesPermitidasIds(habitacionesIds);
            }
          };
          
          fetchActualizarHabitaciones();
          
        } else if (deleteType === 'Tablero') {
          const tablerosConHabitaciones = await Promise.all(selectedItems.map(async (id) => {
            const habitacionesAsignadas = await getHabitacionesByTablero(id);
            return habitacionesAsignadas.length > 0 ? id : null;
          }));

          const tablerosSinHabitaciones = selectedItems.filter(id => !tablerosConHabitaciones.includes(id));
          if (tablerosConHabitaciones.filter(Boolean).length > 0) {
            alert(`Algunos tableros tienen habitaciones asignadas y no se pueden borrar.`);
            setSelectedItems([]);
            setDeleteMode(false);
            return;
          }

          for (const id of tablerosSinHabitaciones) {
            await deleteTablero(id);
          }
          
          // Recargar los tableros
          if (isAdmin) {
            const data = await getTableros();
            setTableros(data);
          } else {
            // Para usuarios normales, filtrar tableros según permisos
            const allTableros = await getTableros();
            const habitacionesPermitidas = await getHabitaciones();
            
            const habitacionesPermitidasMap = new Map();
            habitacionesPermitidas.forEach((hab: Habitacion) => {
              habitacionesPermitidasMap.set(hab.id, hab);
            });
            
            const tablerosConPermiso = [];
            
            for (const tablero of allTableros) {
              const habitacionesTablero = await getHabitacionesByTablero(tablero.id);
              const tienePermiso = habitacionesTablero.some((hab: any) => 
                habitacionesPermitidasMap.has(hab.id)
              );
              
              if (tienePermiso) {
                tablerosConPermiso.push(tablero);
              }
            }
            
            setTableros(tablerosConPermiso);
          }
          
          setSelectedItems([]);
          setDeleteMode(false);
        }
      } catch (error) {
        console.error("Error deleting items:", error);
      }
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  // Manejo de caso cuando el usuario no tiene acceso a ningún tablero
  if (tableros.length === 0) {
    return (
      <Box 
        sx={{ 
          backgroundColor: 'black', 
          color: 'white', 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          textAlign: 'center',
          padding: 2
        }}
      >
        <Typography variant="h5" sx={{ marginBottom: 2 }}>
          No tienes acceso a ningún tablero
        </Typography>
        <Typography variant="body1">
          Contacta al administrador para solicitar acceso a tableros y habitaciones
        </Typography>
        <Button 
          variant="contained" 
          sx={{ 
            backgroundColor: '#1ECAFF', 
            color: 'black',
            fontWeight: 'bold',
            marginTop: 4,
            '&:hover': {
              backgroundColor: '#18b2e1',
            }
          }}
          onClick={() => {
            localStorage.removeItem('token');
            navigate('/login');
          }}
        >
          Cerrar sesión
        </Button>
      </Box>
    );
  }

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  // Modificado para abrir el diálogo de confirmación en lugar de cerrar sesión directamente
  const handleLogoutClick = () => {
    setUserMenuAnchorEl(null);
    setLogoutDialogOpen(true);
  };

  // Función para confirmar el cierre de sesión
  const handleLogoutConfirm = () => {
    localStorage.removeItem('token');
    navigate('/login');
    setLogoutDialogOpen(false);
  };

  // Función para cancelar el cierre de sesión
  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };

  const handleBoltClick = () => {
    navigate('/consumption');
  };

  const handleBarChartClick = () => {
    navigate('/statistics');
  };

  const handleAccountClick = () => {
    console.log("Account Icon Clicked");
  };

  return (
    <Box sx={{ backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0 }}>
        <TabManager 
          selectedTab={selectedTab} 
          setSelectedTab={setSelectedTab} 
          editMode={editMode} 
          setEditMode={setEditMode} 
          setHabitaciones={setHabitaciones} 
          setTableros={setTableros}
          deleteMode={deleteMode}
          setDeleteMode={setDeleteMode} 
          handleDeleteOptionSelect={handleDeleteOptionSelect}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems} 
          deleteType={deleteType} 
          user={user}
          setRoomMatrixView={setRoomMatrixView} 
          tableros={tableros} // Pasamos explícitamente los tableros filtrados
        />
        <Box display="flex" alignItems="center" sx={{ marginLeft: 'auto', justifyContent: 'flex-end', alignItems: 'center' }}>
          {editMode && (
            <>
              <IconButton color={deleteMode && selectedItems.length > 0 ? "error" : "inherit"} onClick={handleDeleteAction}>
                <DeleteIcon sx={{ color: deleteMode && selectedItems.length > 0 ? "red" : "white" }} />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{ 
                  sx: { 
                    minWidth: '150px', 
                    backgroundColor: '#333',
                    color: 'white',
                    borderRadius: '4px',
                  }
                }}
              >
                <MenuItem 
                  onClick={() => handleDeleteOptionSelect('Tablero')} 
                  sx={{ 
                    color: '#1ECAFF',
                    '&:hover': {
                      backgroundColor: 'rgba(30, 202, 255, 0.1)',
                    }
                  }}
                >
                  Tablero
                </MenuItem>
                <MenuItem 
                  onClick={() => handleDeleteOptionSelect('Habitación')} 
                  sx={{ 
                    color: '#1ECAFF',
                    '&:hover': {
                      backgroundColor: 'rgba(30, 202, 255, 0.1)',
                    }
                  }}
                >
                  Habitación
                </MenuItem>
              </Menu>
            </>
          )}
          {isAdmin && (
            <>
              <IconButton color={editMode ? "primary" : "inherit"} onClick={toggleEditMode}>
                <EditIcon />
              </IconButton>
              <IconButton color="inherit" onClick={handleSettingsClick}>
                <SettingsIcon />
              </IconButton>
            </>
          )}
          <IconButton color="inherit" onClick={handleBoltClick}>
            <BoltIcon />
          </IconButton>
          <IconButton color="inherit" onClick={handleBarChartClick}>
            <BarChartIcon />
          </IconButton>
          <Box display="flex" flexDirection="column" alignItems="center">
            <IconButton color="inherit" onClick={handleUserMenuClick}>
              <AccountCircleIcon />
            </IconButton>
            <Typography variant="caption" sx={{ color: 'white', fontSize: '0.7rem', marginTop: '-8px' }}>
              {user.username}
            </Typography>
          </Box>
          <Menu
            anchorEl={userMenuAnchorEl}
            open={Boolean(userMenuAnchorEl)}
            onClose={handleUserMenuClose}
            PaperProps={{ 
              sx: { 
                minWidth: '150px', 
                backgroundColor: '#333',
                color: 'white'
              }
            }}
          >
            <MenuItem onClick={handleLogoutClick} sx={{ height: '20px', color: '#1ECAFF' }}>Cerrar sesión</MenuItem>
          </Menu>
        </Box>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: '#1ECAFF', width: '100%', flexShrink: 0 }} />
      <Box display="flex" sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          p: 2,
          // Aplicamos los estilos de barra de desplazamiento al panel de habitaciones
          ...scrollbarStyle
        }}>
          <RoomMatrix 
            habitaciones={habitaciones} 
            deleteMode={deleteMode && deleteType === 'Habitación'} 
            selectedItems={selectedItems} 
            handleDeleteSelectionChange={handleDeleteSelectionChange} 
            editMode={editMode}
            roomMatrixView={roomMatrixView}
            setRoomMatrixView={setRoomMatrixView}
          />
        </Box>
        <Box sx={{ 
          width: '300px', 
          minWidth: '300px',
          flexShrink: 0,
          overflow: 'hidden',
          p: 2 
        }}>
          {/* Pasamos todas las habitaciones permitidas y la flag isAdmin */}
          <DeviceList 
            habitacionesPermitidas={todasHabitacionesPermitidasIds} 
            isAdmin={isAdmin} 
          />
        </Box>
      </Box>

      {/* Diálogo de confirmación de cierre de sesión */}
      <Dialog 
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
        PaperProps={{
          style: {
            backgroundColor: '#333',
            color: 'white',
            borderRadius: '10px',
            minWidth: '300px'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#1ECAFF', 
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}>
          Cerrar sesión
        </DialogTitle>
        <DialogContent sx={{ paddingTop: '8px' }}>
          <Typography sx={{ color: 'white' }}>
            ¿Estás seguro de que deseas cerrar la sesión?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: '16px' }}>
          <Button 
            onClick={handleLogoutCancel} 
            sx={{ 
              color: '#1ECAFF',
              '&:hover': {
                backgroundColor: 'rgba(30, 202, 255, 0.1)',
              }
            }}
          >
            CANCELAR
          </Button>
          <Button 
            onClick={handleLogoutConfirm} 
            variant="contained" 
            sx={{ 
              backgroundColor: '#1ECAFF', 
              color: 'black',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#18b2e1',
              }
            }}
          >
            CERRAR SESIÓN
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para mostrar habitaciones que no se pueden borrar por tener dispositivos */}
      <Dialog 
        open={habitacionesConDispositivosDialogOpen}
        onClose={() => setHabitacionesConDispositivosDialogOpen(false)}
        PaperProps={{
          style: {
            backgroundColor: '#333',
            color: 'white',
            borderRadius: '10px',
            minWidth: '300px'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#1ECAFF', 
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}>
          No se pueden eliminar habitaciones
        </DialogTitle>
        <DialogContent sx={{ paddingTop: '8px' }}>
          <Typography sx={{ color: 'white', marginBottom: '8px' }}>
            Las siguientes habitaciones tienen dispositivos asignados y no se pueden borrar:
          </Typography>
          <Box sx={{ 
            backgroundColor: '#222', 
            padding: '8px', 
            borderRadius: '4px',
            maxHeight: '150px',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#111',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#1ECAFF',
              borderRadius: '10px',
            },
          }}>
            {habitacionesConDispositivosLista.map((nombre, index) => (
              <Typography key={index} sx={{ color: '#FF6B6B', fontSize: '0.9rem', marginBottom: '4px' }}>
                • {nombre}
              </Typography>
            ))}
          </Box>
          <Typography sx={{ color: 'white', marginTop: '16px' }}>
            Para eliminar estas habitaciones, primero debes quitar todos los dispositivos asignados a ellas desde la sección de configuración de dispositivos.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: '16px' }}>
          <Button 
            onClick={() => setHabitacionesConDispositivosDialogOpen(false)} 
            variant="contained" 
            sx={{ 
              backgroundColor: '#1ECAFF', 
              color: 'black',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#18b2e1',
              }
            }}
          >
            ENTENDIDO
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
