import React, { useCallback } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import BoltIcon from '@mui/icons-material/Bolt';
import { Dispositivo } from '../../services/DeviceStateService';

// Estilos y tamaños - Ajustar según tu diseño
const POWER_BUTTON_SIZE = 39;
const ANIMATION_DURATION = 0.3;

// Formato para consumo y color - Suponiendo que tienes estas funciones
const formatearConsumo = (consumo?: number) => consumo !== undefined ? `${consumo.toFixed(1)} W` : '0 W';
const getColorForConsumo = (consumo?: number) => consumo && consumo > 0 ? '#00FF00' : 'white';

interface DeviceCardProps {
  dispositivo: Dispositivo;
  onToggleDevice: (id: number) => void;
  loadingDevices: {[key: number]: boolean};
}

const DeviceCard: React.FC<DeviceCardProps> = React.memo(({
  dispositivo,
  onToggleDevice,
  loadingDevices
}) => {
  const { id, nombre, estado, online, consumo } = dispositivo;
  const isLoading = loadingDevices[id] || false;
  const isOn = Boolean(estado);
  
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
      onToggleDevice(id);
    }
  }, [id, isLoading, onToggleDevice]);

  return (
    <Box 
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 2,
        backgroundColor: '#333',
        borderRadius: 2,
        mb: 1,
        opacity: online ? 1 : 0.6,
      }}
    >
      <Typography variant="body1">{nombre}</Typography>
      
      {/* Consumo */}
      {online && (
        <Box display="flex" alignItems="center" mr={2}>
          <BoltIcon sx={{ fontSize: '0.9rem', color: getColorForConsumo(consumo), mr: 0.5 }} />
          <Typography variant="body2" sx={{ color: getColorForConsumo(consumo) }}>
            {formatearConsumo(consumo)}
          </Typography>
        </Box>
      )}
      
      {/* Botón de encendido/apagado */}
      {online && (
        <Box
          sx={{
            position: 'relative',
            width: POWER_BUTTON_SIZE,
            height: POWER_BUTTON_SIZE,
          }}
        >
          {/* Indicador de carga */}
          {isLoading && (
            <CircularProgress
              size={POWER_BUTTON_SIZE}
              sx={{
                color: '#2391FF',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 2,
              }}
            />
          )}
          
          {/* Botón de encendido */}
          <Box
            onClick={handleToggle}
            sx={{
              position: 'relative',
              width: POWER_BUTTON_SIZE,
              height: POWER_BUTTON_SIZE,
              borderRadius: '50%',
              backgroundColor: isOn ? 'white' : '#383838',
              '&:hover': {
                backgroundColor: isOn ? '#f5f5f5' : '#404040',
                cursor: 'pointer',
              },
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: isLoading ? 0.3 : 1,
            }}
          >
            <PowerSettingsNewIcon
              sx={{
                fontSize: '1.2rem',
                color: isOn ? '#2391FF' : 'white',
                transition: `color ${ANIMATION_DURATION}s ease-in-out`,
              }}
            />
            
            <Box
              className={isOn ? 'power-ring-on' : 'power-ring-off'}
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: isOn ? '4px solid #2391FF' : '2px solid white',
                boxSizing: 'border-box',
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
});

export default DeviceCard;
