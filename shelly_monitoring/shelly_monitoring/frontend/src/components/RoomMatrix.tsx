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
    <Box display="flex" flexWrap="wrap" gap={0.5}> {/* CAMBIO: De gap={0} a gap={0.5} para alinear con los otros componentes */}
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
                m: 0.5, // CAMBIO: Reducido de 1 a 0.5 (de 8px a 4px)
                p: 1.5, // CAMBIO: Reducido de 2 a 1.5 (de 16px a 12px)
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
                <BoltIcon sx={{ fontSize: '1rem', color: '#1976d2', mr: 0.5 }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    color: '#1976d2',
                  }}
                >
                  {consumo}
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
