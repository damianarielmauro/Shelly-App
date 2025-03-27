import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, Checkbox } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import {
  DispositivoConConsumo,
  obtenerDispositivosHabitacionConConsumo,
  formatearConsumo,
  getColorForConsumo,
  iniciarActualizacionPeriodica,
  suscribirseADispositivosHabitacionActualizados
} from '../services/consumptionService';

interface RoomDeviceMatrixProps {
  habitacionId: number;
  editMode: boolean;
}

const RoomDeviceMatrix: React.FC<RoomDeviceMatrixProps> = ({ habitacionId, editMode }) => {
  const [dispositivos, setDispositivos] = useState<DispositivoConConsumo[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  useEffect(() => {
    // Iniciar actualización periódica
    iniciarActualizacionPeriodica();

    // Cargar dispositivos de la habitación
    const cargarDispositivos = async () => {
      try {
        const data = await obtenerDispositivosHabitacionConConsumo(habitacionId);
        setDispositivos(data);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    cargarDispositivos();

    // Suscribirse a actualizaciones de dispositivos de esta habitación
    const unsuscribir = suscribirseADispositivosHabitacionActualizados(
      habitacionId,
      cargarDispositivos
    );

    return () => {
      unsuscribir();
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
          backgroundColor: '#1ECAFF',
        },
      }}
    >
      <Box
        display="flex"
        flexWrap="wrap"
        gap={0.5}
      >
        {dispositivos.map((dispositivo) => {
          return (
            <Card
              key={dispositivo.id}
              sx={{
                m: 0.5,
                p: 1.5,
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
                <BoltIcon sx={{ 
                  fontSize: '0.75rem',
                  color: getColorForConsumo(dispositivo.consumo),
                  mr: 0.5 
                }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 'bold',
                    color: getColorForConsumo(dispositivo.consumo),
                  }}
                >
                  {formatearConsumo(dispositivo.consumo)}
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
