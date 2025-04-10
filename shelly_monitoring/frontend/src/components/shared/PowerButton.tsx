import React, { useCallback, useState } from 'react';
import { Box, IconButton, CircularProgress } from '@mui/material';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { POWER_BUTTON_SIZE, ANIMATION_DURATION } from '../../styles/deviceStyles';

/**
 * Propiedades para el componente PowerButton
 * @property {boolean} isOn - Si el dispositivo está encendido o apagado
 * @property {boolean} isLoading - Si el dispositivo está procesando un cambio de estado
 * @property {Function} onClick - Función a llamar al hacer clic en el botón
 * @property {number} deviceId - ID del dispositivo asociado a este botón
 */
export interface PowerButtonProps {
  isOn: boolean;
  isLoading: boolean;
  onClick: (id: number) => void;
  deviceId: number;
}

/**
 * Botón de encendido/apagado para dispositivos
 * Optimizado con React.memo para evitar renderizados innecesarios
 */
const PowerButton: React.FC<PowerButtonProps> = React.memo(({ 
  isOn, 
  isLoading, 
  onClick, 
  deviceId 
}) => {
  // Handler optimizado con useCallback
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClick(deviceId);
  }, [deviceId, onClick]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: POWER_BUTTON_SIZE,
        height: POWER_BUTTON_SIZE,
      }}
    >
      {/* Indicador de carga superpuesto usando opacidad */}
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
      
      {/* El botón siempre está presente, solo cambia su opacidad */}
      <IconButton
        onClick={handleClick}
        disabled={isLoading}
        size="small"
        sx={{
          position: 'relative',
          width: POWER_BUTTON_SIZE,
          height: POWER_BUTTON_SIZE,
          borderRadius: '50%',
          backgroundColor: isOn ? 'white' : '#383838',
          '&:hover': {
            backgroundColor: isOn ? '#f5f5f5' : '#404040',
          },
          p: 0,
          boxShadow: 'none',
          transition: 'none',
          opacity: isLoading ? 0.3 : 1, // Cambia opacidad durante la carga
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
            border: isOn 
              ? '4px solid #2391FF'
              : '2px solid white',
            boxShadow: 'none',
            transition: 'none',
          }}
        />
      </IconButton>
    </Box>
  );
});

export default PowerButton;
