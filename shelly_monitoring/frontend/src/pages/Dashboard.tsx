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
import { getHabitacionesByTablero, deleteTablero, deleteHabitacion, getTableros, getHabitaciones } from '../services/api';
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

interface DashboardProps {
  user: {
    permissions: string[];
    username: string;
    role: string; // Asegúrate de que este campo 'role' esté disponible
  };
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [tableros, setTableros] = useState<any[]>([]);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editMenuAnchorEl, setEditMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsMenuAnchorEl, setSettingsMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteType, setDeleteType] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [roomMatrixView, setRoomMatrixView] = useState<boolean>(true); // Nuevo estado
  // Nuevo estado para el diálogo de confirmación de cierre de sesión
  const [logoutDialogOpen, setLogoutDialogOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  // Usamos el campo 'role' para verificar si es admin
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    const token = localStorage.getItem('token');
    setAuthToken(token);

    const fetchTableros = async () => {
      try {
        const data = await getTableros();
        setTableros(data);
      } catch (error) {
        console.error("Error fetching tableros:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTableros();
  }, []);

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
          for (const id of selectedItems) {
            await deleteHabitacion(id);
          }
          const newHabitaciones = habitaciones.filter(hab => !selectedItems.includes(hab.id));
          setHabitaciones(newHabitaciones);
          setSelectedItems([]);
          setDeleteMode(false);
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
          const data = await getTableros();
          setTableros(data);
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

  useEffect(() => {
    const fetchHabitacionesPermitidas = async () => {
      try {
        const habitacionesPermitidas = await getHabitaciones();
        const tableroId = tableros[selectedTab].id;
        const habitacionesTablero = await getHabitacionesByTablero(tableroId);

        const habitacionesFiltradas = habitacionesTablero.filter((hab: Habitacion) => habitacionesPermitidas.some((perm: Habitacion) => perm.id === hab.id));
        setHabitaciones(habitacionesFiltradas);
      } catch (error) {
        console.error("Error fetching habitaciones:", error);
      }
    };

    if (tableros.length > 0 && tableros[selectedTab]) {
      fetchHabitacionesPermitidas();
    }
  }, [selectedTab, tableros]);

  if (loading) {
    return <CircularProgress />;
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
          setRoomMatrixView={setRoomMatrixView} // Pasamos setRoomMatrixView
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
          <DeviceList />
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
    </Box>
  );
};

export default Dashboard;
