import React, { useState, useEffect } from 'react';
import { Checkbox, Box, Typography, Card } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import RoomDeviceMatrix from './RoomDeviceMatrix';
import { 
  obtenerDispositivosConConsumo, 
  calcularConsumoHabitacion, 
  formatearConsumo,
  DispositivoConConsumo
} from '../services/consumptionService';

interface RoomMatrixProps {
  habitaciones: any[];
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
  const [dispositivos, setDispositivos] = useState<DispositivoConConsumo[]>([]);
  const [habitacionesConConsumo, setHabitacionesConConsumo] = useState<any[]>([]);

  // Función para cargar dispositivos y calcular consumos
  const cargarConsumosHabitaciones = async () => {
    try {
      const dispositivosData = await obtenerDispositivosConConsumo();
      setDispositivos(dispositivosData);
      
      // Calcular consumo por habitación
      const habitacionesActualizadas = habitaciones.map(habitacion => {
        const consumoTotal = calcularConsumoHabitacion(habitacion.id, dispositivosData);
        return {
          ...habitacion,
          consumo: consumoTotal
        };
      });
      
      setHabitacionesConConsumo(habitacionesActualizadas);
    } catch (error) {
      console.error('Error al cargar consumos de habitaciones:', error);
    }
  };

  useEffect(() => {
    cargarConsumosHabitaciones();
    
    // Actualizar cada 2 segundos
    const intervalo = setInterval(() => {
      cargarConsumosHabitaciones();
    }, 2000);
    
    return () => clearInterval(intervalo);
  }, [habitaciones]);

  useEffect(() => {
    setSelectedHabitacion(null);
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
        habitacionesConConsumo.map((habitacion) => {
          // Determinar color basado en el valor de consumo
          const consumoColor = habitacion.consumo < 0 ? 'red' : '#1ECAFF';
          const consumoFormateado = formatearConsumo(habitacion.consumo);

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
