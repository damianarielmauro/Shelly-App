import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, Checkbox } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { getDispositivosByHabitacion } from '../services/api';
import { obtenerDispositivosConConsumo, formatearConsumo } from '../services/consumptionService';

// Definir interfaces para los tipos
interface Dispositivo {
  id: number;
  nombre: string;
  consumo?: number;
  [key: string]: any; // Para cualquier otra propiedad
}

interface RoomDeviceMatrixProps {
  habitacionId: number;
  editMode: boolean;
}

const RoomDeviceMatrix: React.FC<RoomDeviceMatrixProps> = ({ habitacionId, editMode }) => {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Función para determinar color según el valor de consumo
  const getColorForConsumo = (consumo: number) => {
    return consumo >= 0 ? '#1ECAFF' : '#00ff00';
  };

  useEffect(() => {
    // Función para actualizar dispositivos con consumos
    const actualizarDispositivos = async () => {
      try {
        // Obtener lista base de dispositivos para esta habitación
        const dispositivosBase = await getDispositivosByHabitacion(habitacionId);
        
        // Obtener todos los dispositivos con datos de consumo actualizados
        const todosDispositivos = await obtenerDispositivosConConsumo();
        
        // Actualizar dispositivos con sus consumos actuales
        const dispositivosActualizados = dispositivosBase.map((disp: Dispositivo) => {
          // Buscar el dispositivo correspondiente en la lista de consumos
          const dispositivoConConsumo = todosDispositivos.find((d: Dispositivo) => d.id === disp.id);
          
          // Si lo encontramos, actualizamos su consumo
          if (dispositivoConConsumo) {
            return { ...disp, consumo: dispositivoConConsumo.consumo };
          }
          
          return disp;
        });
        
        setDispositivos(dispositivosActualizados);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    // Obtener datos iniciales
    actualizarDispositivos();
    
    // Configurar actualización periódica (cada 2 segundos)
    const interval = setInterval(actualizarDispositivos, 2000);
    setRefreshInterval(interval);
    
    // Limpieza al desmontar el componente
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [habitacionId]);

  const handleCheckboxChange = (id: number) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((itemId) => itemId !== id)
        : [...prevSelected, id]
    );
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      sx={{
        overflowY: 'scroll',
        height: 'calc(100vh - 85px)', // Ajustar la altura para el scroll
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'black',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#1ECAFF', // Actualizado a #1ECAFF
          borderRadius: '3px',
        },
        scrollbarWidth: 'thin',
        scrollbarColor: '#1ECAFF black',
      }}
    >
      <Box
        display="flex"
        flexWrap="wrap"
        gap={1}
      >
        {dispositivos.map((dispositivo) => {
          const consumoActual = dispositivo.consumo || 0;
          const consumoFormateado = formatearConsumo(consumoActual);
          const consumoColor = getColorForConsumo(consumoActual);

          return (
            <Card
              key={dispositivo.id}
              sx={{
                m: 1,
                p: 2,
                backgroundColor: '#333',
                color: 'white',
                width: '240px',
                height: '50px',
                textAlign: 'center',
                borderRadius: '8px',
                position: 'relative',
              }}
            >
              {editMode && (
                <Checkbox
                  checked={selectedItems.includes(dispositivo.id)}
                  onChange={() => handleCheckboxChange(dispositivo.id)}
                  sx={{
                    position: 'absolute',
                    bottom: '-5px',
                    right: '-5px',
                    color: 'red',
                    '& .MuiSvgIcon-root': {
                      color: selectedItems.includes(dispositivo.id) ? 'red' : 'red',
                    },
                    '&.Mui-checked': {
                      backgroundColor: 'none',
                    },
                  }}
                />
              )}
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '50%',
                  mb: 0.5,
                }}
              >
                {dispositivo.nombre}
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="center">
                <BoltIcon sx={{ fontSize: '0.75rem', color: consumoColor, mr: 0.5 }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 'bold',
                    color: consumoColor,
                  }}
                >
                  {consumoFormateado}
                </Typography>
              </Box>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default RoomDeviceMatrix;
