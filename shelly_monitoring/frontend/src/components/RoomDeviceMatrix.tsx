import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, Checkbox, Button, Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { getDispositivosByHabitacion } from '../services/api';

interface RoomDeviceMatrixProps {
  habitacionId: number;
  editMode: boolean;
  // Propiedades adicionales para compatibilidad con Dashboard.tsx
  habitacionesPermitidas?: number[];
  isAdmin?: boolean;
}

const RoomDeviceMatrix: React.FC<RoomDeviceMatrixProps> = ({ 
  habitacionId, 
  editMode,
  // Valores por defecto para las propiedades opcionales
  habitacionesPermitidas = [], 
  isAdmin = false 
}) => {
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  // Nuevo estado para los consumos de los dispositivos
  const [consumosDispositivos, setConsumosDispositivos] = useState<{[key: number]: number}>({});

  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        const data = await getDispositivosByHabitacion(habitacionId);
        setDispositivos(data);
        
        // Inicializar consumos aleatorios para cada dispositivo
        const consumos: {[key: number]: number} = {};
        data.forEach((dispositivo: any) => {
          consumos[dispositivo.id] = Math.floor(Math.random() * (3578 - 7 + 1)) + 7;
        });
        setConsumosDispositivos(consumos);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    fetchDispositivos();
    
    // Actualizar consumos cada 2 segundos, similar a DeviceList
    const intervalo = setInterval(() => {
      // Actualizar consumos individuales
      setConsumosDispositivos(prev => {
        const nuevosConsumos: {[key: number]: number} = {};
        Object.keys(prev).forEach(id => {
          nuevosConsumos[Number(id)] = Math.floor(Math.random() * (3578 - 7 + 1)) + 7;
        });
        return nuevosConsumos;
      });
    }, 2000);
    
    // Limpiar el intervalo al desmontar el componente
    return () => clearInterval(intervalo);
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
          backgroundColor: '#1976d2',
        },
      }}
    >
      <Box
        display="flex"
        flexWrap="wrap"
        gap={0.5} // CAMBIO: Reducido de 1 a 0.5 (de 8px a 4px)
      >
        {dispositivos.map((dispositivo) => {
          // Usar el consumo del estado en lugar del dispositivo directamente
          const consumo = consumosDispositivos[dispositivo.id] || 0;
          const formattedConsumo = 
            consumo < 1000
              ? `${consumo} W`
              : `${(consumo / 1000).toFixed(2)} kW`;
          
          // Determinar el color según el consumo - CORREGIDO: Usando #1ECAFF para positivos
          const consumoColor = consumo >= 0 ? '#1ECAFF' : '#00ff00';

          return (
            <Card
              key={dispositivo.id}
              sx={{
                m: 0.5, // CAMBIO: Reducido de 1 a 0.5 (de 8px a 4px)
                p: 1.5, // CAMBIO: Reducido de 2 a 1.5 (de 16px a 12px)
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
                  {formattedConsumo}
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
