import React, { useState, useEffect } from 'react';
import { Checkbox, Box, Typography, Card } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import RoomDeviceMatrix from './RoomDeviceMatrix';
import { getDispositivosByHabitacion } from '../services/api';

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
  // Nuevo estado para almacenar los consumos calculados de cada habitación
  const [habitacionesConsumos, setHabitacionesConsumos] = useState<{[key: number]: number}>({});

  // Reset de selectedHabitacion cuando cambian las habitaciones
  useEffect(() => {
    setSelectedHabitacion(null);
    
    // Inicializamos el cálculo de consumos para cada habitación
    const initConsumos = async () => {
      const consumos: {[key: number]: number} = {};
      
      // Para cada habitación, obtenemos sus dispositivos y calculamos la suma de consumos
      await Promise.all(habitaciones.map(async (habitacion) => {
        try {
          const dispositivos = await getDispositivosByHabitacion(habitacion.id);
          
          // Inicializar consumos aleatorios para cada dispositivo
          const consumoHabitacion = dispositivos.reduce((total: number, dispositivo: any) => {
            // Generar un consumo aleatorio para cada dispositivo (entre 7W y 3578W)
            const consumoDispositivo = Math.floor(Math.random() * (3578 - 7 + 1)) + 7;
            return total + consumoDispositivo;
          }, 0);
          
          consumos[habitacion.id] = consumoHabitacion;
        } catch (error) {
          console.error(`Error al obtener dispositivos de habitación ${habitacion.id}:`, error);
          consumos[habitacion.id] = 0;
        }
      }));
      
      setHabitacionesConsumos(consumos);
    };
    
    // Iniciar el cálculo de consumos
    initConsumos();
    
    // Actualizar los consumos cada 2 segundos
    const intervalo = setInterval(() => {
      setHabitacionesConsumos(prev => {
        const nuevosConsumos: {[key: number]: number} = {};
        
        // Para cada habitación calculamos un nuevo consumo basado en el anterior
        // Simulando una variación natural de ±10%
        Object.keys(prev).forEach(id => {
          const habitacionId = Number(id);
          const consumoActual = prev[habitacionId];
          const variacion = consumoActual * 0.1 * (Math.random() > 0.5 ? 1 : -1);
          nuevosConsumos[habitacionId] = Math.max(0, Math.round(consumoActual + variacion));
        });
        
        return nuevosConsumos;
      });
    }, 2000);
    
    return () => clearInterval(intervalo);
  }, [habitaciones]);

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
        habitaciones.map((habitacion) => {
          // Obtener el consumo calculado para esta habitación o usar 0 si no está disponible
          const consumoValue = habitacionesConsumos[habitacion.id] || 0;
          
          // Formatear el consumo como en los otros componentes
          const consumo = 
            consumoValue < 1000
              ? `${consumoValue} W`
              : `${(consumoValue / 1000).toFixed(2)} kW`;

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
                <BoltIcon sx={{ fontSize: '1rem', color: '#1ECAFF', mr: 0.5 }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    color: '#1ECAFF',
                  }}
                >
                  {consumo}
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
