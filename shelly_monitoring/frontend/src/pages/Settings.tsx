import React from 'react';
import Discovery from '../components/Discovery';
import UsersManagement from '../pages/UsersManagement';
import { Tabs, Tab, Box } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';

interface SettingsProps {
  user: {
    permissions: string[];
  };
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [selectedTab, setSelectedTab] = React.useState(0);
  const navigate = useNavigate();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleHomeClick = () => {
    navigate('/dashboard');
  };

  return (
    <Box sx={{ backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0 }}>
        <Tabs value={selectedTab} onChange={handleTabChange} aria-label="settings-tabs" sx={{ color: 'white', fontSize: '1.25rem' }}>
          <Tab label="Descubrir Dispositivos" sx={{ color: 'white', fontWeight: selectedTab === 0 ? 'bold' : 'normal' }} />
          <Tab label="Usuarios y Perfiles" sx={{ color: 'white', fontWeight: selectedTab === 1 ? 'bold' : 'normal' }} />
        </Tabs>
        <HomeIcon sx={{ color: 'white', cursor: 'pointer', marginRight: '18px' }} onClick={handleHomeClick} />
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: '#1976d2', width: '100%', flexShrink: 0 }} />
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {selectedTab === 0 && <Discovery user={user} />}
        {selectedTab === 1 && <UsersManagement user={user} />}
      </Box>
    </Box>
  );
};

export default Settings;
