import React from 'react';
import Discovery from '../components/Discovery';
import UsersManagement from '../pages/UsersManagement';
import DeviceMatrix from '../components/DeviceMatrix';  // Importar el nuevo componente
import { Tabs, Tab, Box } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import EditIcon from '@mui/icons-material/Edit';  // Importar EditIcon
import { useNavigate } from 'react-router-dom';
import { checkPermission } from '../services/auth';

interface SettingsProps {
  user: {
    permissions: string[];
  };
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [selectedTab, setSelectedTab] = React.useState(0);
  const [editMode, setEditMode] = React.useState(false);  // Estado para el modo de edición
  const navigate = useNavigate();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleHomeClick = () => {
    navigate('/dashboard');
  };

  const handleEditClick = () => {
    setEditMode(!editMode);  // Alternar el modo de edición
  };

  return (
    <Box sx={{ backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0 }}>
        <Tabs value={selectedTab} onChange={handleTabChange} aria-label="settings-tabs" sx={{ color: 'white', fontSize: '1.25rem' }}>
          <Tab label="Descubrir Dispositivos" sx={{ color: 'white', fontWeight: selectedTab === 0 ? 'bold' : 'normal' }} />
          <Tab label="Dispositivos" sx={{ color: 'white', fontWeight: selectedTab === 1 ? 'bold' : 'normal' }} />  {/* Pestaña en el medio */}
          <Tab label="Usuarios y Perfiles" sx={{ color: 'white', fontWeight: selectedTab === 2 ? 'bold' : 'normal' }} />
        </Tabs>
        <Box display="flex" alignItems="center">
          {selectedTab === 1 && <EditIcon sx={{ color: 'white', cursor: 'pointer', marginRight: '18px' }} onClick={handleEditClick} />}  {/* Icono de edición */}
          <HomeIcon sx={{ color: 'white', cursor: 'pointer', marginRight: '18px' }} onClick={handleHomeClick} />
        </Box>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: '#1976d2', width: '100%', flexShrink: 0 }} />
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {selectedTab === 0 && checkPermission(user, 'discover_devices') && <Discovery user={user} />}
        {selectedTab === 1 && checkPermission(user, 'view_devices') && <DeviceMatrix user={user} editMode={editMode} />}  {/* Pasar editMode */}
        {selectedTab === 2 && checkPermission(user, 'manage_users') && <UsersManagement user={user} />}
      </Box>
    </Box>
  );
};

export default Settings;
