import React from 'react';
import { Checkbox, Box, Typography, Card, CardContent } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';

interface RoomMatrixProps {
  habitaciones: any[];
  deleteMode: boolean;
  selectedItems: number[];
  handleDeleteSelectionChange: (id: number) => void;
}

const RoomMatrix: React.FC<RoomMatrixProps> = ({
  habitaciones,
  deleteMode,
  selectedItems,
  handleDeleteSelectionChange,
}) => {
  return (
    <Box display="flex" flexWrap="wrap" gap={0}>
      {habitaciones.map((habitacion) => {
        const consumo =
          habitacion.consumo < 1000
            ? `${habitacion.consumo} W`
            : `${(habitacion.consumo / 1000).toFixed(2)} kW`;

        return (
          <Card
            key={habitacion.id}
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
      })}
    </Box>
  );
};

export default RoomMatrix;
