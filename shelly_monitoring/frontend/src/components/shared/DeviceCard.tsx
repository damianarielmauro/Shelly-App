import React, { useCallback, useMemo, memo } from 'react';
import { 
  Box, Typography, Card, Checkbox, Tooltip
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloseIcon from '@mui/icons-material/Close';
import { formatearConsumo, getColorForConsumo } from '../../services/consumptionService';
import { Dispositivo } from '../../services/DeviceStateService';
import DeviceTypeImage from './DeviceTypeImage';
import PowerButton from './PowerButton';
import { CARD_WIDTH, CARD_HEIGHT, CARD_MARGIN } from '../../styles/deviceStyles';

// Componente para cada tarjeta de dispositivo - Optimizado con un memo avanzado
const DeviceCard = memo(({ 
  dispositivo, 
  isEditing, 
  isSelected, 
  onToggleDevice, 
  onSelect,
  loadingDevices,
  style
}: {
  dispositivo: Dispositivo;
  isEditing?: boolean;
  isSelected?: boolean;
  onToggleDevice: (id: number) => void;
  onSelect?: (id: number) => void;
  loadingDevices: {[key: number]: boolean};
  style?: React.CSSProperties; // Para virtualización
}) => {
  // Memoizamos los cálculos frecuentes para evitar recalculos innecesarios
  const formattedConsumo = useMemo(() => formatearConsumo(dispositivo.consumo), [dispositivo.consumo]);
  const consumoColor = useMemo(() => getColorForConsumo(dispositivo.consumo), [dispositivo.consumo]);
  const isOnline = Boolean(dispositivo.online);
  const isLoading = loadingDevices[dispositivo.id] || false;
  const isAssigned = Boolean(dispositivo.habitacion_id);
  const isOn = Boolean(dispositivo.estado);

  // Ajustamos el padding izquierdo para acomodar el círculo más grande
  const paddingLeft = 65; // Aumentado para dar espacio al círculo más grande
  
  // Calcular el centro horizontal de la tarjeta para los íconos
  const cardCenterX = CARD_WIDTH / 2; // Centro de la tarjeta 
  const iconSize = 12; // Tamaño aproximado de los iconos
  const iconSpacing = 8; // Espacio entre los iconos

  // Memoizamos el callback para evitar re-renders innecesarios
  const handleSelect = useCallback(() => {
    if (onSelect) {
      onSelect(dispositivo.id);
    }
  }, [dispositivo.id, onSelect]);

  return (
    <div style={{
      ...style,
      padding: CARD_MARGIN,
      boxSizing: 'border-box',
      willChange: 'transform',
    }}>
      <Card
        className="device-card"
        sx={{
          backgroundColor: '#2F3235',
          color: 'white',
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          textAlign: 'center',
          borderRadius: '8px',
          position: 'relative',
          p: 1.5,
        }}
      >
        {/* Ahora X (sin habitación) va a la izquierda del centro */}
        {!isAssigned && (
          <Tooltip 
            title="Sin habitación" 
            arrow 
            placement="top"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: '#333',
                  color: 'white',
                  fontSize: '0.7rem',
                  boxShadow: '0px 2px 8px rgba(0,0,0,0.6)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                }
              },
              arrow: {
                sx: {
                  color: '#333'
                }
              }
            }}
          >
            <CloseIcon
              sx={{
                position: 'absolute',
                bottom: '4px',
                left: `${cardCenterX - iconSize - (iconSpacing/2)}px`,
                color: '#ff4444',
                fontSize: '0.75rem'
              }}
            />
          </Tooltip>
        )}
        
        {/* Ahora nube (offline) va a la derecha del centro */}
        {!isOnline && (
          <Tooltip 
            title="Offline" 
            arrow 
            placement="top"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: '#333',
                  color: 'white',
                  fontSize: '0.7rem',
                  boxShadow: '0px 2px 8px rgba(0,0,0,0.6)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                }
              },
              arrow: {
                sx: {
                  color: '#333'
                }
              }
            }}
          >
            <CloudOffIcon
              sx={{
                position: 'absolute',
                bottom: '4px',
                left: `${cardCenterX + (iconSpacing/2)}px`,
                color: '#ff4444',
                fontSize: '0.75rem'
              }}
            />
          </Tooltip>
        )}
        
        {isEditing && onSelect && (
          <Checkbox
            checked={isSelected}
            onChange={handleSelect}
            sx={{
              position: 'absolute',
              bottom: '-5px',
              right: '-5px',
              color: 'red',
              '& .MuiSvgIcon-root': {
                color: isSelected ? 'red' : 'red',
              },
              '&.Mui-checked': {
                backgroundColor: 'none',
              },
            }}
          />
        )}
        
        {/* Imagen del tipo de dispositivo al lado izquierdo - Reposicionada para el círculo más grande */}
        <Box sx={{ 
          position: 'absolute',
          left: '8px', // Ajustado para mantener el mismo margen visual
          top: '5px', // Ajustado para centrar en la tarjeta
        }}>
          <DeviceTypeImage tipo={dispositivo.tipo} />
        </Box>
        
        {/* Nombre del dispositivo - Ajustado para dar más espacio al círculo más grande */}
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.65rem',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            height: '40%',
            position: 'absolute',
            top: '10px',
            left: `${paddingLeft}px`, // Aumentado para dar espacio al círculo más grande
            right: '45px', // Espacio adicional para el botón más grande
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {dispositivo.nombre}
        </Typography>
        
        {/* Botón de encendido/apagado - Reposicionado para el botón más grande */}
        {(!isEditing || isEditing === undefined) && isOnline && (
          <Box sx={{ 
            position: 'absolute',
            right: '9px', // Ajustado para el botón más grande
            top: '8px', // Ajustado para el botón más grande
          }}>
            <PowerButton 
              isOn={isOn} 
              isLoading={isLoading}
              onClick={onToggleDevice}
              deviceId={dispositivo.id}
            />
          </Box>
        )}
        
        {/* Información de consumo - Solo se muestra si el dispositivo está online */}
        {isOnline && (
          <Box 
            display="flex" 
            alignItems="center" 
            justifyContent="flex-start"
            sx={{
              position: 'absolute',
              bottom: '10px',
              left: `${paddingLeft}px`, // Aumentado para alinear con el nombre
              right: '40px',
            }}
          >
            <BoltIcon sx={{ fontSize: '0.75rem', color: consumoColor, mr: 0.5 }} />
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.65rem',
                fontWeight: 'bold',
                color: consumoColor,
              }}
            >
              {formattedConsumo}
            </Typography>
          </Box>
        )}
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  // Implementamos un comparador de igualdad personalizado para DeviceCard
  // Solo re-renderizamos si uno de estos valores ha cambiado
  return (
    prevProps.dispositivo.id === nextProps.dispositivo.id &&
    prevProps.dispositivo.estado === nextProps.dispositivo.estado &&
    prevProps.dispositivo.consumo === nextProps.dispositivo.consumo &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.loadingDevices[prevProps.dispositivo.id] === nextProps.loadingDevices[nextProps.dispositivo.id] &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
  );
});

export default DeviceCard;
