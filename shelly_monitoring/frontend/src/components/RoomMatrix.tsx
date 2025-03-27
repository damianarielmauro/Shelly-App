import React, { useState, useEffect } from 'react';
import { Checkbox, Box, Typography, Card } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import RoomDeviceMatrix from './RoomDeviceMatrix';
import {
  HabitacionConConsumo,
  obtenerHabitacionesConConsumo,
  formatearConsumo,
  getColorForConsumo,
  suscribirseAHabitacionesActualizadas,
  iniciarActualizacionPeriodica
} from '../services/consumptionService';

interface RoomMatrixProps {
  habitaciones: any[];
  deleteMode: boolean;
  selectedItems: number[];
  handleDeleteSelectionChange: (id: number) => void;
  editMode: boolean;
  roomMatrixView: boolean;
  setRoomMatrixView: React.Dispatch<React.SetStateAction<boolean>>;
  selectedHabitacion: number | null;
  setSelectedHabitacion: React.Dispatch<React.SetStateAction<number | null>>;
}

const RoomMatrix: React.FC<RoomMatrixProps> = ({
  habitaciones,
  deleteMode,
  selectedItems,
  handleDeleteSelectionChange,
  editMode,
  roomMatrixView,
  setRoomMatrixView,
  selectedHabitacion,
  setSelectedHabitacion
}) => {
  // Estado para almacenar las habitaciones con sus consumos actualizados
  const [habitacionesConConsumo, setHabitacionesConConsumo] = useState<HabitacionConConsumo[]>([]);

  useEffect(() => {
    // Iniciar el servicio de actualización periódica
    iniciarActualizacionPeriodica();
    
    // Función para actualizar las habitaciones con sus consumos
    const actualizarHabitaciones = async () => {
      try {
        // Obtener habitaciones con consumos del servicio centralizado
        const habitacionesConsumo = await obtenerHabitacionesConConsumo(true); // forzar refresco
        
        // Mapear solo las habitaciones que están en el prop habitaciones
        const habitacionesIds = new Set(habitaciones.map(h => h.id));
        const habitacionesFiltradas = habitacionesConsumo.filter(h => habitacionesIds.has(h.id));
        
        // Actualizar el estado con las habitaciones filtradas
        setHabitacionesConConsumo(habitacionesFiltradas);
      } catch (error) {
        console.error('Error al actualizar habitaciones con consumo:', error);
      }
    };
    
    // Cargar datos iniciales
    actualizarHabitaciones();
    
    // Suscribirse a cambios en las habitaciones
    const unsuscribir = suscribirseAHabitacionesActualizadas(() => {
      actualizarHabitaciones();
    });
    
    // Limpiar al desmontar
    return () => {
      unsuscribir();
    };
  }, [habitaciones]);

  // Resetear habitación seleccionada cuando cambian las habitaciones
  useEffect(() => {
    setSelectedHabitacion(null);
  }, [habitaciones, setSelectedHabitacion]);

  const handleRoomClick = (habitacionId: number) => {
    // Solo cambiar vista si no estamos en modo de borrado
    if (roomMatrixView && !deleteMode) {
      setSelectedHabitacion(habitacionId);
      setRoomMatrixView(false);
    } else if (deleteMode) {
      // Si estamos en modo borrado, solo manejar el checkbox
      handleDeleteSelectionChange(habitacionId);
    }
  };

  return (
    <Box display="flex" flexWrap="wrap" gap={0.5}>
      {roomMatrixView ? (
        habitacionesConConsumo.map((habitacion) => {
          // Usar funciones del servicio para formatear valores
          const consumoFormateado = formatearConsumo(habitacion.consumo);
          const consumoColor = getColorForConsumo(habitacion.consumo);

          return (
            <Card
              key={habitacion.id}
              onClick={() => handleRoomClick(habitacion.id)}
              sx={{
                m: 0.5,
                p: 1.5,
                backgroundColor: '#333',
                color: 'white',
                width: '120px',
                height: '100px',
                textAlign: 'center',
                borderRadius: '8px',
                position: 'relative',
                cursor: deleteMode ? 'default' : 'pointer', // Cambiar cursor según el modo
              }}
            >
              {deleteMode && (
                <Checkbox
                  checked={selectedItems.includes(habitacion.id)}
                  onChange={() => handleDeleteSelectionChange(habitacion.id)}
                  onClick={(e) => e.stopPropagation()} // Evitar que el clic en el checkbox active el handleRoomClick
                  sx={{
                    position: 'absolute',
                    bottom: '-5px',
                    right: '-5px',
                    color: 'red',
                    '& .MuiSvgIcon-root': {
                      color: selectedItems.includes(habitacion.id) ? 'red' : 'red',
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
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '50%',
                  mb: 0.5,
                }}
              >
                {habitacion.nombre}
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="center">
                <BoltIcon sx={{ fontSize: '1rem', color: consumoColor, mr: 0.5 }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    color: consumoColor,
                  }}
                >
                  {consumoFormateado}
                </Typography>
              </Box>
            </Card>
          );
        })
      ) : (
        // Solo mostrar dispositivos si no estamos en modo borrado
        !deleteMode && selectedHabitacion !== null && (
          <RoomDeviceMatrix habitacionId={selectedHabitacion} editMode={editMode} />
        )
      )}
    </Box>
  );
};

export default RoomMatrix;
