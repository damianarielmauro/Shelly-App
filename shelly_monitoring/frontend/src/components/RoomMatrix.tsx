import React, { useState, useEffect } from 'react';
import { Box, Typography, Card } from '@mui/material';
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
  editMode: boolean;
  roomMatrixView: boolean;
  setRoomMatrixView: React.Dispatch<React.SetStateAction<boolean>>;
  selectedHabitacion: number | null;
  setSelectedHabitacion: React.Dispatch<React.SetStateAction<number | null>>;
  // Añadimos propiedades para renombrar y eliminar dispositivos
  onRenameDispositivo?: (id: number, newName: string) => Promise<void>;
  onDeleteDispositivo?: (id: number, type: string) => void;
}

const RoomMatrix: React.FC<RoomMatrixProps> = ({
  habitaciones,
  editMode,
  roomMatrixView,
  setRoomMatrixView,
  selectedHabitacion,
  setSelectedHabitacion,
  onRenameDispositivo,
  onDeleteDispositivo
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
    // Si estamos en vista de matriz, cambiar a vista detallada de habitación
    if (roomMatrixView) {
      setSelectedHabitacion(habitacionId);
      setRoomMatrixView(false);
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
                cursor: 'pointer',
              }}
            >
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
        // Mostrar dispositivos de la habitación seleccionada
        // Pasamos las propiedades para renombrar y eliminar dispositivos
        selectedHabitacion !== null && (
          <RoomDeviceMatrix 
            habitacionId={selectedHabitacion} 
            editMode={editMode}
            onRenameDispositivo={onRenameDispositivo}
            onDeleteDispositivo={onDeleteDispositivo}
          />
        )
      )}
    </Box>
  );
};

export default RoomMatrix;
