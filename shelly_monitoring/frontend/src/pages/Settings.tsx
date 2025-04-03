import React, { useState, useEffect } from 'react';
import { Box, Tab, Typography } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import RoomsManagement from '../components/RoomsManagement';
import UsersManagement from '../components/UsersManagement';
import DevicesManagement from '../components/DevicesManagement';
import FirmwareUpdatePanel from '../components/FirmwareUpdatePanel';
import { checkForFirmwareUpdates } from '../services/firmwareService';
import { FirmwareUpdate } from '../types/firmware';

const Settings: React.FC = () => {
  const location = useLocation();
  const initialTab = location.state?.activeTab || 'HABITACIONES';
  const [tab, setTab] = useState(initialTab);
  const [firmwareUpdates, setFirmwareUpdates] = useState<FirmwareUpdate[]>([]);
  
  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const updates = await checkForFirmwareUpdates();
        setFirmwareUpdates(updates);
      } catch (error) {
        console.error('Error al verificar actualizaciones de firmware:', error);
      }
    };
    
    fetchUpdates();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#000' }}>
      <Header title="Configuración" />
      <Box sx={{ flex: 1, m: 2, display: 'flex', flexDirection: 'column' }}>
        <TabContext value={tab}>
          <Box sx={{ borderBottom: 1, borderColor: '#333' }}>
            <TabList 
              onChange={handleTabChange}
              sx={{
                '& .MuiTab-root': {
                  color: 'white',
                  '&.Mui-selected': {
                    color: '#2391FF',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#2391FF',
                }
              }}
            >
              <Tab label="HABITACIONES" value="HABITACIONES" />
              <Tab 
                label={
                  <Box display="flex" alignItems="center">
                    DISPOSITIVOS
                    {firmwareUpdates.length > 0 && (
                      <Box
                        component="span"
                        sx={{
                          ml: 1,
                          backgroundColor: '#2391FF',
                          color: 'black',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {firmwareUpdates.length}
                      </Box>
                    )}
                  </Box>
                } 
                value="DISPOSITIVOS" 
              />
              <Tab label="USUARIOS" value="USUARIOS" />
            </TabList>
          </Box>

          <TabPanel value="HABITACIONES" sx={{ p: 0, mt: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <RoomsManagement />
          </TabPanel>
          <TabPanel value="DISPOSITIVOS" sx={{ p: 0, mt: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ bgcolor: '#151515', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid #333', color: 'white' }}>
                Gestión de Dispositivos
              </Typography>
              
              {/* Si hay actualizaciones, mostrarlas primero */}
              {firmwareUpdates.length > 0 && (
                <Box sx={{ backgroundColor: '#111', borderBottom: '1px solid #333' }}>
                  <FirmwareUpdatePanel updates={firmwareUpdates} />
                </Box>
              )}
              
              {/* Componente de gestión de dispositivos existente */}
              <DevicesManagement />
            </Box>
          </TabPanel>
          <TabPanel value="USUARIOS" sx={{ p: 0, mt: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <UsersManagement />
          </TabPanel>
        </TabContext>
      </Box>
    </Box>
  );
};

export default Settings;
