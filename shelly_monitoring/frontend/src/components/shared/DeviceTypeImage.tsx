import React from 'react';
import { Box } from '@mui/material';
import { deviceTypeImages, defaultImage, CIRCLE_SIZE } from '../../styles/deviceStyles';

// Definimos explícitamente la interfaz para las props
interface DeviceTypeImageProps {
  tipo: string;
}

// Aseguramos que el componente sea explícitamente tipado con DeviceTypeImageProps
const DeviceTypeImage: React.FC<DeviceTypeImageProps> = React.memo(({ tipo }) => {
  const imageSource = React.useMemo(() => {
    return deviceTypeImages[tipo] || defaultImage;
  }, [tipo]);
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1B1D21',
      }}
    >
      <img
        src={imageSource}
        alt={`Tipo: ${tipo}`}
        style={{
          width: '80%',
          height: '80%',
          objectFit: 'contain',
        }}
      />
    </Box>
  );
});

export default DeviceTypeImage;
