import React, { useEffect, useState } from 'react';
import { Box, Typography, Card } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import {
  DispositivoConConsumo,
  obtenerDispositivosHabitacionConConsumo,
  formatearConsumo,
  getColorForConsumo,
  iniciarActualizacionPeriodica,
  suscribirseADispositivosHabitacionActualizados
} from '../services/consumptionService';
import { updateOrdenDispositivos } from '../services/api';
import DraggableDeviceGrid from './DraggableDeviceGrid';

interface RoomDeviceMatrixProps {
  habitacionId: number;
  editMode: boolean;
}

const RoomDeviceMatrix: React.FC<RoomDeviceMatrixProps> = ({ 
  habitacionId, 
  editMode 
}) => {
  const [dispositivos, setDispositivos] = useState<DispositivoConConsumo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Iniciar actualización periódica
    iniciarActualizacionPeriodica();

    // Cargar dispositivos de la habitación
    const cargarDispositivos = async () => {
      try {
        setLoading(true);
        const data = await obtenerDispositivosHabitacionConConsumo(habitacionId);
        setDispositivos(data);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDispositivos();

    // Suscribirse a actualizaciones de dispositivos de esta habitación
    const unsuscribir = suscribirseADispositivosHabitacionActualizados(
      habitacionId,
      // Solo actualizar si no estamos en modo edición para evitar conflictos
      () => !editMode && cargarDispositivos()
    );

    return () => {
      unsuscribir();
    };
  }, [habitacionId, editMode]);

  // Manejar reordenamiento de dispositivos
  const handleReorderDevices = async (newOrder: DispositivoConConsumo[]) => {
    try {
      // Preparar datos para API
      const ordenData = newOrder.map((disp, index) => ({
        id: disp.id,
        orden: index
      }));
      
      // Llamar a API para actualizar el orden
      await updateOrdenDispositivos(ordenData);
      
      // Actualizar el estado local
      setDispositivos(newOrder);
    } catch (error) {
      console.error('Error reordering devices:', error);
      // Recargar dispositivos en caso de error
      const data = await obtenerDispositivosHabitacionConConsumo(habitacionId);
      setDispositivos(data);
    }
  };

  // Si estamos en modo edición, usar el componente DraggableDeviceGrid
  if (editMode) {
    return (
      <Box
        sx={{
          overflowY: 'auto',
          height: 'calc(100vh - 85px)',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'black',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#2391FF',
          },
        }}
      >
        <DraggableDeviceGrid
          dispositivos={dispositivos}
          editMode={editMode}
          onReorder={handleReorderDevices}
        />
      </Box>
    );
  }

  // Vista normal (no edición)
  return (
    <Box
      display="flex"
      flexDirection="column"
      sx={{
        overflowY: 'auto',
        height: 'calc(100vh - 85px)', // Ajustar la altura para el scroll
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'black',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#2391FF',
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
