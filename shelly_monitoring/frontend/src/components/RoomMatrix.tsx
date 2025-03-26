import React, { useState, useEffect } from 'react';
import { Checkbox, Box, Typography, Card } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import RoomDeviceMatrix from './RoomDeviceMatrix';
import { obtenerHabitacionesConConsumo, formatearConsumo } from '../services/consumptionService';

// Definir interfaces para los tipos
interface Habitacion {
  id: number;
  nombre: string;
  consumo?: number;
  tablero_id: number;
  [key: string]: any;
}

interface RoomMatrixProps {
  habitaciones: Habitacion[];
  deleteMode: boolean;
  selectedItems: number[];
  handleDeleteSelectionChange: (id: number) => void;
  editMode: boolean;
  roomMatrixView: boolean;
  setRoomMatrixView: React.Dispatch<React.SetStateAction<boolean>>;
}

const RoomMatrix: React.FC<RoomMatrixProps> = ({
  habitaciones,
  deleteMode,
  selectedItems,
  handleDeleteSelectionChange,
  editMode,
  roomMatrixView,
  setRoomMatrixView
}) => {
  const [selectedHabitacion, setSelectedHabitacion] = useState<number | null>(null);
  const [habitacionesConConsumo, setHabitacionesConConsumo] = useState<Habitacion[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Función para determinar color según el valor de consumo
  const getColorForConsumo = (consumo: number) => {
    return consumo >= 0 ? '#1ECAFF' : '#00ff00';
  };

  useEffect(() => {
    setSelectedHabitacion(null);
    
    // Función para actualizar consumos de habitaciones
    const actualizarConsumos = async () => {
      try {
        // Obtener habitaciones con consumos actualizados
        const habitacionesActualizadas = await obtenerHabitacionesConConsumo();
        
        // Filtrar para mostrar solo las habitaciones que nos interesan
        const habitacionesActualizadasFiltradas = habitaciones.map((hab: Habitacion) => {
          const habitacionConConsumo = habitacionesActualizadas.find((h: Habitacion) => h.id === hab.id);
          return habitacionConConsumo || hab;
        });
        
        setHabitacionesConConsumo(habitacionesActualizadasFiltradas);
      } catch (error) {
        console.error('Error al obtener habitaciones con consumo:', error);
      }
    };

    // Obtener datos iniciales
    actualizarConsumos();
    
    // Configurar actualización periódica
    const interval = setInterval(actualizarConsumos, 2000);
    setRefreshInterval(interval);
    
    // Limpieza al desmontar
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [habitaciones]);

  const handleRoomClick = (habitacionId: number) => {
    if (roomMatrixView) {
      setSelectedHabitacion(habitacionId);
      setRoomMatrixView(false);
    }
  };

  return (
    <Box display="flex" flexWrap="wrap" gap={0}>
      {roomMatrixView ? (
        (habitacionesConConsumo.length > 0 ? habitacionesConConsumo : habitaciones).map((habitacion) => {
          // Formatear el consumo usando la función auxiliar
          const consumoActual = habitacion.consumo || 0;
          const consumoFormateado = formatearConsumo(consumoActual);
          const consumoColor = getColorForConsumo(consumoActual);

          return (
            <Card
              key={habitacion.id}
              onClick={() => handleRoomClick(habitacion.id)}
              sx={{
                m: 1,
                p: 2,
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
              {deleteMode && (
                <Checkbox
                  checked={selectedItems.includes(habitacion.id)}
                  onChange={() => handleDeleteSelectionChange(habitacion.id)}
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
        selectedHabitacion !== null && (
          <RoomDeviceMatrix habitacionId={selectedHabitacion} editMode={editMode} />
        )
      )}
    </Box>
  );
};

export default RoomMatrix;
