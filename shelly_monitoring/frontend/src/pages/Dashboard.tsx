import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, IconButton, Box, Menu, MenuItem, CircularProgress, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import RoomMatrix from '../components/RoomMatrix';
import TabManager from '../components/TabManager';
import DeviceList from '../components/DeviceList';
import DraggableTabManager from '../components/DraggableTabManager';
import DraggableRoomGrid from '../components/DraggableRoomGrid';
import { getHabitacionesByTablero, deleteTablero, deleteHabitacion, getTableros, getHabitaciones, updateTableroName, updateOrdenTableros, updateOrdenHabitaciones, renameHabitacion, cambiarTableroHabitacion, createTablero, createHabitacion, renameDispositivo, deleteDispositivo } from '../services/api';
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
    backgroundColor: '#2391FF', // Color azul para el "thumb" (parte deslizable)
    borderRadius: '3px', // Bordes redondeados para el thumb
  },
  // Firefox scrollbar
  scrollbarWidth: 'thin',
  scrollbarColor: '#2391FF #000', // thumb y track
};

interface Habitacion {
  id: number;
  nombre: string;
  tablero_id: number;
  orden?: number;
  consumo?: number;
}

interface Tablero {
  id: number;
  nombre: string;
  orden?: number;
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editMenuAnchorEl, setEditMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsMenuAnchorEl, setSettingsMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [roomMatrixView, setRoomMatrixView] = useState<boolean>(true);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState<boolean>(false);
  const [todasHabitacionesPermitidasIds, setTodasHabitacionesPermitidasIds] = useState<number[]>([]);
  const [selectedHabitacion, setSelectedHabitacion] = useState<number | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<{id: number, type: string} | null>(null);
  
  // Estados para el botón de añadir
  const [addAnchorEl, setAddAnchorEl] = useState<null | HTMLElement>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogType, setAddDialogType] = useState<'Tablero' | 'Habitación'>('Tablero');
  const [newItemName, setNewItemName] = useState('');
  
  const navigate = useNavigate();

  // Usamos el campo 'role' para verificar si es admin
  const isAdmin = user.role === 'admin';

  // Modificamos setSelectedTab para que maneje correctamente el cambio de tablero
  const handleTabChange = (newValue: number | ((prevState: number) => number)) => {
    // Determinar el valor numérico del nuevo tab
    const newTab = typeof newValue === 'function' 
      ? newValue(selectedTab) // Si es una función, evalúala con el estado actual
      : newValue;              // Si es un número directo, úsalo tal cual
      
    if (newTab !== selectedTab) {
      // Limpiamos habitaciones inmediatamente para evitar mostrar las anteriores
      setHabitaciones([]);
      
      // Si estábamos en vista de habitación, cambiar a vista matriz
      if (!roomMatrixView) {
        setRoomMatrixView(true);
        setSelectedHabitacion(null);
      }
      
      // Actualizar el tab seleccionado
      setSelectedTab(newTab);
    }
  };

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
  }, [isAdmin]);

  // Efecto para cargar habitaciones cuando cambia el tablero seleccionado
  // Este efecto se ejecuta DESPUÉS de que se cambia el tablero seleccionado
  useEffect(() => {
    // Evitar ejecución inicial o cuando no hay tableros
    if (!tableros || tableros.length === 0 || selectedTab >= tableros.length) {
      return;
    }
    
    const fetchHabitacionesPermitidas = async () => {
      try {
        // Obtener el ID del tablero seleccionado
        const tableroId = tableros[selectedTab].id;
        
        // Cargar habitaciones del nuevo tablero
        const habitacionesTablero = await getHabitacionesByTablero(tableroId);
        
        // Para administradores, mostrar todas las habitaciones del tablero
        if (isAdmin) {
          setHabitaciones(habitacionesTablero);
        } else {
          // Para usuarios normales, filtrar por permisos
          const habitacionesPermitidas = await getHabitaciones();
          const habitacionesFiltradas = habitacionesTablero.filter((hab: Habitacion) => 
            habitacionesPermitidas.some((perm: Habitacion) => perm.id === hab.id)
          );
          
          setHabitaciones(habitacionesFiltradas);
        }
      } catch (error) {
        console.error("Error fetching habitaciones:", error);
        setHabitaciones([]);
      }
    };

    fetchHabitacionesPermitidas();
  }, [selectedTab, tableros, isAdmin]);


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

  // Función para confirmar el borrado
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      const { id, type } = itemToDelete;
      
      if (type === 'Habitación') {
        await deleteHabitacion(id);
        // Actualizar habitaciones localmente
        setHabitaciones(prevHabitaciones => prevHabitaciones.filter(hab => hab.id !== id));
      } else if (type === 'Tablero') {
        // Verificar si el tablero tiene habitaciones
        const habitacionesAsignadas = await getHabitacionesByTablero(id);
        if (habitacionesAsignadas.length > 0) {
          setErrorMessage('Este tablero tiene habitaciones asignadas y no se puede borrar.');
          setErrorDialogOpen(true);
          setDeleteDialogOpen(false);
          return;
        }
        
        await deleteTablero(id);
        // Actualizar tableros localmente
        setTableros(prevTableros => prevTableros.filter(tab => tab.id !== id));
        // Si se eliminó el tablero actual, seleccionar otro
        if (tableros[selectedTab]?.id === id && tableros.length > 1) {
          setSelectedTab(selectedTab === 0 ? 0 : selectedTab - 1);
        }
      } else if (type === 'Dispositivo') {
        // Nueva función para eliminar dispositivos
        await deleteDispositivo(id);
        // No necesitamos actualizar el estado local ya que se manejará a través de eventos
      }
      
      setDeleteDialogOpen(false);
      
      // Actualizar la lista de habitaciones permitidas después de borrar
      const fetchActualizarHabitaciones = async () => {
        if (isAdmin) {
          const allTableros = await getTableros();
          let allHabitaciones: Habitacion[] = [];
          
          for (const tablero of allTableros) {
            const habitacionesTablero = await getHabitacionesByTablero(tablero.id);
            allHabitaciones = [...allHabitaciones, ...habitacionesTablero];
          }
          
          const habitacionesIds = Array.from(new Set(allHabitaciones.map(hab => hab.id)));
          setTodasHabitacionesPermitidasIds(habitacionesIds);
        } else {
          const habitacionesPermitidas = await getHabitaciones();
          const habitacionesIds = habitacionesPermitidas.map((hab: Habitacion) => hab.id);
          setTodasHabitacionesPermitidasIds(habitacionesIds);
        }
      };
      
      fetchActualizarHabitaciones();
      
    } catch (error: any) {
      console.error("Error deleting item:", error);
      const errorDetails = error?.response?.data?.error || `Error al eliminar ${itemToDelete.type.toLowerCase()}. Por favor, inténtelo de nuevo.`;
      setErrorMessage(errorDetails);
      setErrorDialogOpen(true);
    }
  };

  // Función para mostrar diálogo de confirmación de borrado
  const handleShowDeleteConfirm = (id: number, type: string) => {
    setItemToDelete({ id, type });
    setDeleteDialogOpen(true);
  };

  // Función para renombrar dispositivos (NUEVA)
  const handleRenameDispositivo = async (id: number, newName: string) => {
    try {
      if (!newName.trim()) {
        setErrorMessage('El nombre no puede estar vacío.');
        setErrorDialogOpen(true);
        return;
      }
      
      console.log('Renombrando dispositivo:', id, 'nuevo nombre:', newName);
      const response = await renameDispositivo(id, newName);
      console.log('Respuesta de API al renombrar dispositivo:', response);
      
      // No necesitamos actualizar el estado local, ya que esto se manejará a través de eventos
    } catch (error: any) {
      console.error('Error renaming dispositivo:', error);
      const errorDetails = error?.response?.data?.error || 'Error al renombrar el dispositivo. Por favor, inténtelo de nuevo.';
      setErrorMessage(errorDetails);
      setErrorDialogOpen(true);
    }
  };

  // Funciones para manejar operaciones de drag & drop y renombrado
  const handleRenameTablero = async (id: number, newName: string) => {
    try {
      if (!newName.trim()) {
        setErrorMessage('El nombre no puede estar vacío.');
        setErrorDialogOpen(true);
        return;
      }
      
      console.log('Renombrando tablero:', id, 'nuevo nombre:', newName);
      const response = await updateTableroName(id, newName);
      console.log('Respuesta de API al renombrar tablero:', response);
      
      // Actualizar el tablero localmente
      setTableros(prev => prev.map(tablero => 
        tablero.id === id ? { ...tablero, nombre: newName } : tablero
      ));
    } catch (error: any) {
      console.error('Error renaming tablero:', error);
      // Mostrar más detalles del error para diagnóstico
      const errorDetails = error?.response?.data?.error || 'Error al renombrar el tablero. Por favor, inténtelo de nuevo.';
      setErrorMessage(errorDetails);
      setErrorDialogOpen(true);
    }
  };

  const handleReorderTableros = async (newOrder: Tablero[]) => {
    try {
      // Preparar datos para API
      const ordenData = newOrder.map((tablero, index) => ({
        id: tablero.id,
        orden: index
      }));
      
      // Llamar a API para actualizar el orden
      await updateOrdenTableros(ordenData);
      
      // Actualizar el estado local
      setTableros(newOrder);
    } catch (error) {
      console.error('Error reordering tableros:', error);
      setErrorMessage('Error al reordenar los tableros. Por favor, inténtelo de nuevo.');
      setErrorDialogOpen(true);
      // Recargar tableros en caso de error
      const data = await getTableros();
      setTableros(data);
    }
  };

  const handleRenameHabitacion = async (id: number, newName: string) => {
    try {
      if (!newName.trim()) {
        setErrorMessage('El nombre no puede estar vacío.');
        setErrorDialogOpen(true);
        return;
      }
      
      console.log('Renombrando habitación:', id, 'nuevo nombre:', newName);
      const response = await renameHabitacion(id, newName);
      console.log('Respuesta de API al renombrar habitación:', response);
      
      // Actualizar localmente
      setHabitaciones(prev => prev.map(hab => 
        hab.id === id ? { ...hab, nombre: newName } : hab
      ));
    } catch (error: any) {
      console.error('Error renaming habitacion:', error);
      // Mostrar más detalles del error para diagnóstico
      const errorDetails = error?.response?.data?.error || 'Error al renombrar la habitación. Por favor, inténtelo de nuevo.';
      setErrorMessage(errorDetails);
      setErrorDialogOpen(true);
    }
  };

  const handleReorderHabitaciones = async (newOrder: Habitacion[]) => {
    try {
      // Preparar datos para API
      const ordenData = newOrder.map((hab, index) => ({
        id: hab.id,
        orden: index
      }));
      
      // Llamar a API para actualizar el orden
      await updateOrdenHabitaciones(ordenData);
      
      // Actualizar el estado local
      setHabitaciones(newOrder);
    } catch (error) {
      console.error('Error reordering habitaciones:', error);
      setErrorMessage('Error al reordenar las habitaciones. Por favor, inténtelo de nuevo.');
      setErrorDialogOpen(true);
      // Recargar habitaciones en caso de error
      if (tableros.length > 0 && selectedTab < tableros.length) {
        const tableroId = tableros[selectedTab].id;
        const habitacionesActualizadas = await getHabitacionesByTablero(tableroId);
        setHabitaciones(habitacionesActualizadas);
      }
    }
  };

  const handleChangeTablero = async (habitacionId: number, tableroId: number) => {
    try {
      console.log(`Intentando mover habitación ${habitacionId} al tablero ${tableroId}`);
      await cambiarTableroHabitacion(habitacionId, tableroId);
      
      // Recargar habitaciones del tablero actual
      if (tableros.length > 0 && selectedTab < tableros.length) {
        const currentTableroId = tableros[selectedTab].id;
        const habitacionesActualizadas = await getHabitacionesByTablero(currentTableroId);
        setHabitaciones(habitacionesActualizadas);
      }
    } catch (error: any) {
      console.error('Error changing tablero:', error);
      const errorDetails = error?.response?.data?.error || 'Error al mover la habitación a otro tablero. Por favor, inténtelo de nuevo.';
      setErrorMessage(errorDetails);
      setErrorDialogOpen(true);
    }
  };
  
  // Funciones para manejar el menú de añadir
  const handleAddClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAddAnchorEl(event.currentTarget);
  };

  const handleAddMenuClose = () => {
    setAddAnchorEl(null);
  };

  const handleAddMenuItemClick = (type: 'Tablero' | 'Habitación') => {
    setAddDialogType(type);
    setNewItemName('');
    setAddDialogOpen(true);
    handleAddMenuClose();
  };

  const handleAddItem = async () => {
    if (newItemName.trim() === '') return;

    try {
      if (addDialogType === 'Tablero') {
        const newTablero = await createTablero(newItemName);
        setTableros((prev) => [...prev, newTablero]);
      } else {
        const tableroId = tableros[selectedTab].id;
        const newHabitacion = await createHabitacion(newItemName, tableroId);
        setHabitaciones((prev) => [...prev, newHabitacion]);
      }
      setAddDialogOpen(false);
    } catch (error) {
      console.error(`Error creating ${addDialogType}:`, error);
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
            backgroundColor: '#2391FF', 
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
        {/* Usar el DraggableTabManager en modo edición o TabManager en modo normal */}
        {editMode ? (
          <DraggableTabManager
            tableros={tableros}
            selectedTab={selectedTab}
            setSelectedTab={handleTabChange}
            editMode={editMode}
            onRename={handleRenameTablero}
            onReorder={handleReorderTableros}
            setRoomMatrixView={setRoomMatrixView}
            onDelete={handleShowDeleteConfirm}
          />
        ) : (
          <TabManager
            selectedTab={selectedTab}
            setSelectedTab={handleTabChange}
            editMode={editMode}
            setEditMode={setEditMode}
            setHabitaciones={setHabitaciones}
            setTableros={setTableros}
            user={user}
            setRoomMatrixView={setRoomMatrixView}
            tableros={tableros}
          />
        )}
        <Box display="flex" alignItems="center" sx={{ marginLeft: 'auto', justifyContent: 'flex-end', alignItems: 'center' }}>
          {isAdmin && (
            <>
              {editMode && (
                <IconButton 
                  onClick={handleAddClick}
                  color="primary"
                  sx={{ mr: 1 }}
                >
                  <AddIcon />
                </IconButton>
              )}
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
            <MenuItem onClick={handleLogoutClick} sx={{ height: '20px', color: '#2391FF' }}>Cerrar sesión</MenuItem>
          </Menu>
        </Box>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: '#2391FF', width: '100%', flexShrink: 0 }} />
      <Box display="flex" sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          p: 2,
          // Aplicamos los estilos de barra de desplazamiento al panel de habitaciones
          ...scrollbarStyle
        }}>
          {editMode && roomMatrixView ? (
            <DraggableRoomGrid
              habitaciones={habitaciones.map(hab => ({...hab, consumo: hab.consumo || 0}))}
              tableros={tableros}
              currentTableroId={tableros[selectedTab]?.id || 0}
              editMode={editMode}
              onReorder={handleReorderHabitaciones}
              onRename={handleRenameHabitacion}
              onChangeTablero={handleChangeTablero}
              onRoomClick={(habitacionId) => {
                setSelectedHabitacion(habitacionId);
                setRoomMatrixView(false);
              }}
              onDelete={handleShowDeleteConfirm}
            />
          ) : (
            <RoomMatrix 
              habitaciones={habitaciones}  
              editMode={editMode}
              roomMatrixView={roomMatrixView}
              setRoomMatrixView={setRoomMatrixView}
              selectedHabitacion={selectedHabitacion}
              setSelectedHabitacion={setSelectedHabitacion}
              onRenameDispositivo={handleRenameDispositivo}
              onDeleteDispositivo={handleShowDeleteConfirm}
            />
          )}
        </Box>
        <Box sx={{ 
          width: '300px', 
          minWidth: '300px',
          flexShrink: 0,
          overflow: 'hidden',
          p: 2 
        }}>
          {/* Pasamos el prop selectedHabitacion al DeviceList */}
          <DeviceList 
            habitacionesPermitidas={todasHabitacionesPermitidasIds} 
            isAdmin={isAdmin}
            roomMatrixView={roomMatrixView}
            selectedHabitacion={selectedHabitacion}
          />
        </Box>
      </Box>

      {/* Menú de añadir */}
      <Menu
        anchorEl={addAnchorEl}
        open={Boolean(addAnchorEl)}
        onClose={handleAddMenuClose}
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
          onClick={() => handleAddMenuItemClick('Tablero')}
          sx={{
            color: '#2391FF',
            '&:hover': {
              backgroundColor: 'rgba(30, 202, 255, 0.1)',
            }
          }}
        >
          Tablero
        </MenuItem>
        <MenuItem
          onClick={() => handleAddMenuItemClick('Habitación')}
          sx={{
            color: '#2391FF',
            '&:hover': {
              backgroundColor: 'rgba(30, 202, 255, 0.1)',
            }
          }}
        >
          Habitación
        </MenuItem>
      </Menu>

      {/* Diálogo para añadir tablero/habitación */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
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
          color: '#2391FF', 
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}>
          {`Añadir ${addDialogType}`}
        </DialogTitle>
        <DialogContent sx={{ paddingTop: '8px' }}>
          <TextField
            autoFocus
            margin="dense"
            label={`Nombre del ${addDialogType}`}
            type="text"
            fullWidth
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            variant="outlined"
            InputLabelProps={{
              style: { color: '#2391FF' },
            }}
            InputProps={{
              style: { color: 'white' },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#2391FF',
                },
                '&:hover fieldset': {
                  borderColor: '#2391FF',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#2391FF',
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ padding: '16px' }}>
          <Button 
            onClick={() => setAddDialogOpen(false)} 
            sx={{ 
              color: '#2391FF',
              '&:hover': {
                backgroundColor: 'rgba(30, 202, 255, 0.1)',
              }
            }}
          >
            CANCELAR
          </Button>
          <Button 
            onClick={handleAddItem} 
            variant="contained" 
            sx={{ 
              backgroundColor: '#2391FF', 
              color: 'black',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#18b2e1',
              }
            }}
          >
            AÑADIR
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de error estilizado */}
      <Dialog 
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
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
          color: '#2391FF', 
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}>
          Error
        </DialogTitle>
        <DialogContent sx={{ paddingTop: '8px' }}>
          <Typography sx={{ color: 'white' }}>
            {errorMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: '16px' }}>
          <Button 
            onClick={() => setErrorDialogOpen(false)} 
            variant="contained" 
            sx={{ 
              backgroundColor: '#2391FF', 
              color: 'black',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#18b2e1',
              }
            }}
          >
            ACEPTAR
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación de borrado */}
      <Dialog 
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
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
          color: '#2391FF', 
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}>
          Confirmar eliminación
        </DialogTitle>
        <DialogContent sx={{ paddingTop: '8px' }}>
          <Typography sx={{ color: 'white' }}>
            {itemToDelete?.type === 'Tablero' 
              ? '¿Está seguro de que desea eliminar este tablero? Esta acción no se puede deshacer.'
              : itemToDelete?.type === 'Habitación'
                ? '¿Está seguro de que desea eliminar esta habitación? Esta acción no se puede deshacer.'
                : '¿Está seguro de que desea eliminar este dispositivo? Esta acción no se puede deshacer.'
            }
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: '16px' }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            sx={{ 
              color: '#2391FF',
              '&:hover': {
                backgroundColor: 'rgba(30, 202, 255, 0.1)',
              }
            }}
          >
            CANCELAR
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            variant="contained" 
            color="error"
            sx={{ 
              fontWeight: 'bold',
            }}
          >
            ELIMINAR
          </Button>
        </DialogActions>
      </Dialog>

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
          color: '#2391FF', 
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
              color: '#2391FF',
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
              backgroundColor: '#2391FF', 
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
    </Box>
  );
};

export default Dashboard;
