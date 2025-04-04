import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Collapse, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { checkForFirmwareUpdates } from '../services/firmwareService';

interface FirmwareUpdateAlertProps {
  isAdmin: boolean;
}

const FirmwareUpdateAlert: React.FC<FirmwareUpdateAlertProps> = ({ isAdmin }) => {
  const [hasUpdates, setHasUpdates] = useState<boolean>(false);
  const [updateCount, setUpdateCount] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Solo verificar actualizaciones si el usuario es administrador
    if (isAdmin) {
      const checkUpdates = async () => {
        try {
          const updates = await checkForFirmwareUpdates();
          const pendingUpdates = updates.filter(update => update.hasUpdate);
          setHasUpdates(pendingUpdates.length > 0);
          setUpdateCount(pendingUpdates.length);
        } catch (error) {
          console.error('Error checking firmware updates:', error);
        }
      };
      
      checkUpdates();
      
      // Verificar actualizaciones cada hora
      const interval = setInterval(checkUpdates, 3600000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);
  
  const handleUpdateClick = () => {
    navigate('/settings', { state: { selectedTab: 3 } });
  };
  
  if (!isAdmin || !hasUpdates) return null;
  
  return (
    <Box sx={{ mx: 2, mb: 2 }}>
      <Collapse in={hasUpdates}>
        <Alert
          severity="info"
          sx={{
            backgroundColor: 'rgba(35, 145, 255, 0.1)',
            color: 'white',
            '& .MuiAlert-icon': {
              color: '#2391FF',
            }
          }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleUpdateClick}
              sx={{
                backgroundColor: '#2391FF',
                color: 'black',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: '#1976d2',
                }
              }}
            >
              Actualizar
            </Button>
          }
        >
          <Typography variant="body2">
            {`Hay ${updateCount} ${updateCount === 1 ? 'actualización' : 'actualizaciones'} de firmware disponible${updateCount !== 1 ? 's' : ''}.`}
          </Typography>
        </Alert>
      </Collapse>
    </Box>
  );
};

export default FirmwareUpdateAlert;
