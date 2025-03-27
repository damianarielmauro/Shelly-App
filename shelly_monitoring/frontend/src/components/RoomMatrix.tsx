import React, { useState, useEffect } from 'react';
import { Checkbox, Box, Typography, Card } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import RoomDeviceMatrix from './RoomDeviceMatrix';

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

  // Reset de selectedHabitacion cuando cambian las habitaciones
  useEffect(() => {
    setSelectedHabitacion(null);
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
          const consumo =
            habitacion.consumo < 1000
              ? `${habitacion.consumo} W`
              : `${(habitacion.consumo / 1000).toFixed(2)} kW`;

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
