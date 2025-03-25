import React from 'react';
import Discovery from '../components/Discovery';
import UsersManagement from '../pages/UsersManagement';
import DeviceMatrix from '../components/DeviceMatrix';
import { Tabs, Tab, Box } from '@mui/material';
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
    backgroundColor: '#1ECAFF', // Color azul para el "thumb" (parte deslizable)
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
  const [selectedTab, setSelectedTab] = React.useState(0);
  const [editMode, setEditMode] = React.useState(false);
  const navigate = useNavigate();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleHomeClick = () => {
    navigate('/dashboard');
  };

  const handleEditClick = () => {
    setEditMode(!editMode);
  };

  return (
    <Box sx={{ backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0 }}>
        <Tabs value={selectedTab} onChange={handleTabChange} aria-label="settings-tabs" sx={{ color: 'white', fontSize: '1.25rem' }}>
          {/* Cambiado el orden de las pestañas según lo solicitado */}
          <Tab label="Dispositivos" sx={{ color: 'white', fontWeight: selectedTab === 0 ? 'bold' : 'normal' }} />
          <Tab label="Descubrir Dispositivos" sx={{ color: 'white', fontWeight: selectedTab === 1 ? 'bold' : 'normal' }} />
          <Tab label="Usuarios y Perfiles" sx={{ color: 'white', fontWeight: selectedTab === 2 ? 'bold' : 'normal' }} />
        </Tabs>
        <Box display="flex" alignItems="center">
          {selectedTab === 0 && <EditIcon sx={{ color: 'white', cursor: 'pointer', marginRight: '18px' }} onClick={handleEditClick} />}
          <HomeIcon sx={{ color: 'white', cursor: 'pointer', marginRight: '18px' }} onClick={handleHomeClick} />
        </Box>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: '#1ECAFF', width: '100%', flexShrink: 0 }} />
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'hidden',
        ...scrollbarStyle // Aplicamos los estilos de barra de desplazamiento consistentes
      }}>
        {/* Actualizado el orden de los componentes para que coincida con el orden de las pestañas */}
        {selectedTab === 0 && checkPermission(user, 'view_devices') && <DeviceMatrix user={user} editMode={editMode} />}
        {selectedTab === 1 && checkPermission(user, 'discover_devices') && <Discovery user={user} />}
        {selectedTab === 2 && checkPermission(user, 'manage_users') && <UsersManagement user={user} />}
      </Box>
    </Box>
  );
};

export default Settings;
