import React, { useState, useEffect } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import DeviceMatrix from '../components/DeviceMatrix';
import DeviceList from '../components/DeviceList';
import DashboardGraph from '../components/DashboardGraph';
import VirtualList from '../components/VirtualList';
import Header from '../components/Header';
import { getUser } from '../services/authService';
import FirmwareUpdateAlert from '../components/FirmwareUpdateAlert';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getUser();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUser();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setSelectedItems([]);
  };

  const handleAssignRoom = () => {
    if (selectedItems.length > 0) {
      setShowRoomDialog(true);
    }
  };

  const isAdmin = user?.permissions?.includes('admin') || false;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#000' }}>
      <Header title="Dashboard" user={user} />
      
      {/* Lista de dispositivos */}
      <Box sx={{ bgcolor: '#151515', borderRadius: '10px', m: 2, mb: 0, overflow: 'hidden' }}>
        <DeviceList />
      </Box>
      
      {/* Notificación de actualización de firmware */}
      <FirmwareUpdateAlert isAdmin={isAdmin} />
      
      {/* Tabs y contenido principal */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: '#151515',
        borderRadius: '10px',
        m: 2, 
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: '#333333',
          bgcolor: '#0A0A0A'
        }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                color: 'white',
                textTransform: 'none',
                fontWeight: 'normal',
                fontSize: '0.85rem',
                '&.Mui-selected': {
                  color: '#2391FF',
                  fontWeight: 'bold',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#2391FF',
              }
            }}
          >
            <Tab label="Matriz" />
            <Tab label="Consumo" />
            <Tab label="Virtual" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          {editMode ? (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#0A0A0A' }}>
              <Typography variant="body2" sx={{ color: 'white', alignSelf: 'center' }}>
                {selectedItems.length === 0 ? 
                  'Seleccione dispositivos para asignar a una habitación' : 
                  `${selectedItems.length} dispositivo(s) seleccionado(s)`
                }
              </Typography>
              <Box>
                <button 
                  className="custom-button cancel"
                  onClick={handleCancelEdit}
                  style={{ marginRight: '10px' }}
                >
                  Cancelar
                </button>
                <button 
                  className="custom-button"
                  onClick={handleAssignRoom}
                  disabled={selectedItems.length === 0}
                >
                  Asignar
                </button>
              </Box>
            </Box>
          ) : (
            user?.permissions?.includes('admin') && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, bgcolor: '#0A0A0A' }}>
                <button className="custom-button" onClick={handleEdit}>
                  Gestionar
                </button>
              </Box>
            )
          )}
          <DeviceMatrix 
            user={user || { permissions: [] }} 
            editMode={editMode}
            onSelectedItemsChange={setSelectedItems}
            showRoomDialog={showRoomDialog}
            setShowRoomDialog={setShowRoomDialog}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <DashboardGraph />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <VirtualList />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default Dashboard;
