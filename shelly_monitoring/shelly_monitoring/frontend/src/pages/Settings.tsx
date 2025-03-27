import React, { useState } from 'react';
import Discovery from '../components/Discovery';
import UsersManagement from '../pages/UsersManagement';
import DeviceMatrix from '../components/DeviceMatrix';
import { Tabs, Tab, Box, Button } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { checkPermission } from '../services/auth';

// Estilos de barra de desplazamiento consistentes para toda la aplicación
const scrollbarStyle = {
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: '#000', // Fondo negro
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#1ECAFF', // Color estandarizado para el "thumb"
    borderRadius: '3px', // Bordes redondeados para el thumb
  },
  // Firefox scrollbar
  scrollbarWidth: 'thin',
  scrollbarColor: '#1ECAFF #000', // thumb y track
};

interface SettingsProps {
  user: {
    permissions: string[];
  };
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<number[]>([]);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const navigate = useNavigate();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleHomeClick = () => {
    navigate('/dashboard');
  };

  const handleEditClick = () => {
    setEditMode(!editMode);
    // Al salir del modo edición, limpiar dispositivos seleccionados
    if (editMode) {
      setSelectedDevices([]);
    }
  };

  const handleShowRoomDialog = () => {
    setShowRoomDialog(true);
  };

  const handleSelectedDevicesChange = (devices: number[]) => {
    setSelectedDevices(devices);
  };

  return (
    <Box sx={{ backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0 }}>
        <Tabs value={selectedTab} onChange={handleTabChange} aria-label="settings-tabs" sx={{ color: 'white', fontSize: '1.25rem' }}>
          <Tab label="Dispositivos" sx={{ color: 'white', fontWeight: selectedTab === 0 ? 'bold' : 'normal' }} />
          <Tab label="Descubrir Dispositivos" sx={{ color: 'white', fontWeight: selectedTab === 1 ? 'bold' : 'normal' }} />
          <Tab label="Usuarios y Perfiles" sx={{ color: 'white', fontWeight: selectedTab === 2 ? 'bold' : 'normal' }} />
        </Tabs>
        <Box display="flex" alignItems="center">
          {/* Botón ASIGNAR HABITACIÓN, aparece condicionalmente */}
          {selectedTab === 0 && editMode && selectedDevices.length > 0 && (
            <Button
              variant="contained"
              onClick={handleShowRoomDialog}
              sx={{
                backgroundColor: '#1ECAFF',
                color: 'black',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                height: '25px',
                mr: 2,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#18b2e1',
                }
              }}
            >
              Asignar a Habitación
            </Button>
          )}
          {selectedTab === 0 && (
            <EditIcon 
              sx={{ 
                color: editMode ? '#1ECAFF' : 'white', 
                cursor: 'pointer', 
                marginRight: '18px' 
              }} 
              onClick={handleEditClick} 
            />
          )}
          <HomeIcon sx={{ color: 'white', cursor: 'pointer', marginRight: '18px' }} onClick={handleHomeClick} />
        </Box>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: '#1ECAFF', width: '100%', flexShrink: 0 }} />
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'hidden',
        ...scrollbarStyle
      }}>
        {selectedTab === 0 && checkPermission(user, 'view_devices') && (
          <DeviceMatrix 
            user={user} 
            editMode={editMode}
            onSelectedItemsChange={handleSelectedDevicesChange}
            showRoomDialog={showRoomDialog}
            setShowRoomDialog={setShowRoomDialog}
          />
        )}
        {selectedTab === 1 && checkPermission(user, 'discover_devices') && <Discovery user={user} />}
        {selectedTab === 2 && checkPermission(user, 'manage_users') && <UsersManagement user={user} />}
      </Box>
    </Box>
  );
};

export default Settings;
