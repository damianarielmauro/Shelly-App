import React, { useState, useEffect } from 'react';
import Discovery from '../components/Discovery';
import UsersManagement from '../pages/UsersManagement';
import DeviceMatrix from '../components/DeviceMatrix';
import FirmwareUpdatePanel from '../components/FirmwareUpdatePanel';
import { Tabs, Tab, Box, Button, CircularProgress } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { checkPermission } from '../services/auth';
import { checkForFirmwareUpdates } from '../services/firmwareService';

// Estilos de barra de desplazamiento consistentes para toda la aplicación
const scrollbarStyle = {
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: '#000', // Fondo negro
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#2391FF', // Color estandarizado para el "thumb"
    borderRadius: '3px', // Bordes redondeados para el thumb
  },
  // Firefox scrollbar
  scrollbarWidth: 'thin',
  scrollbarColor: '#2391FF #000', // thumb y track
};

interface SettingsProps {
  user: {
    permissions: string[];
    role?: string; // Añadido role como opcional para compatibilidad
  };
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<number[]>([]);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [firmwareUpdates, setFirmwareUpdates] = useState<any[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState<boolean>(false);
  const navigate = useNavigate();
  
  // Verificar si el usuario es admin
  const isAdmin = user.role === 'admin' || user.permissions?.includes('admin');

  // Cargar actualizaciones de firmware disponibles cuando se selecciona la pestaña correspondiente
  useEffect(() => {
    if (selectedTab === 3 && isAdmin) {
      setLoadingUpdates(true);
      checkForFirmwareUpdates()
        .then(updates => {
          // Transformar los datos al formato que espera FirmwareUpdatePanel
          const firmwareUpdatesFormatted = updates
            .filter(update => update.hasUpdate)
            .map(update => ({
              modelId: update.deviceId.split('-')[0], // Asumimos que el modelo es la primera parte del deviceId
              modelName: update.deviceName,
              currentVersion: update.currentVersion,
              newVersion: update.newVersion || '',
              releaseDate: update.lastCheck.split('T')[0], // Formateamos la fecha
              deviceCount: 1, // Inicialmente contamos 1 por dispositivo
              releaseNotes: 'Notas de versión no disponibles' // Valor por defecto
            }));

          // Agrupar por modelo para contar dispositivos correctamente
          const modelsMap = new Map();
          firmwareUpdatesFormatted.forEach(update => {
            if (modelsMap.has(update.modelId)) {
              const existingUpdate = modelsMap.get(update.modelId);
              existingUpdate.deviceCount += 1;
            } else {
              modelsMap.set(update.modelId, { ...update });
            }
          });

          setFirmwareUpdates(Array.from(modelsMap.values()));
        })
        .catch(error => {
          console.error('Error cargando actualizaciones de firmware:', error);
          setFirmwareUpdates([]);
        })
        .finally(() => {
          setLoadingUpdates(false);
        });
    }
  }, [selectedTab, isAdmin]);

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
          {/* Mostrar el tab de Firmware solo para administradores */}
          {isAdmin && (
            <Tab label="Actualizar Firmware" sx={{ color: 'white', fontWeight: selectedTab === 3 ? 'bold' : 'normal' }} />
          )}
        </Tabs>
        <Box display="flex" alignItems="center">
          {/* Botón ASIGNAR HABITACIÓN, aparece condicionalmente */}
          {selectedTab === 0 && editMode && selectedDevices.length > 0 && (
            <Button
              variant="contained"
              onClick={handleShowRoomDialog}
              sx={{
                backgroundColor: '#2391FF',
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
                color: editMode ? '#2391FF' : 'white', 
                cursor: 'pointer', 
                marginRight: '18px' 
              }} 
              onClick={handleEditClick} 
            />
          )}
          <HomeIcon sx={{ color: 'white', cursor: 'pointer', marginRight: '18px' }} onClick={handleHomeClick} />
        </Box>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: '#2391FF', width: '100%', flexShrink: 0 }} />
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
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
        {selectedTab === 3 && isAdmin && (
          <Box sx={{ p: 2 }}>
            {loadingUpdates ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                <CircularProgress sx={{ color: '#2391FF' }} />
              </Box>
            ) : (
              <FirmwareUpdatePanel updates={firmwareUpdates} />
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Settings;
