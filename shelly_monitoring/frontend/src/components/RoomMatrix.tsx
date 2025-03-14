import React from 'react';
import { Box, Card, CardContent, Typography, Checkbox } from '@mui/material';
import { checkPermission } from '../services/auth';

interface Habitacion {
  id: number;
  nombre: string;
  consumo: number;
}

interface RoomMatrixProps {
  user: {
    permissions: string[];
  };
  habitaciones: Habitacion[];
  deleteMode: boolean;
  selectedItems: number[];
  handleDeleteSelectionChange: (id: number) => void;
}

const RoomMatrix: React.FC<RoomMatrixProps> = ({ user, habitaciones, deleteMode, selectedItems, handleDeleteSelectionChange }) => {
  return (
    <Box display="flex" flexWrap="wrap">
      {habitaciones.map((habitacion) => (
        <Card key={habitacion.id} sx={{ width: 200, margin: 1, backgroundColor: '#333', color: 'white', position: 'relative' }}>
          <CardContent>
            <Typography variant="h6" component="div">
              {habitacion.nombre}
            </Typography>
            <Typography variant="body2">
              Consumo: {habitacion.consumo} kWh
            </Typography>
            {deleteMode && checkPermission(user, 'delete_habitacion') && (
              <Checkbox
                checked={selectedItems.includes(habitacion.id)}
                onChange={() => handleDeleteSelectionChange(habitacion.id)}
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  color: 'red',
                  '& .MuiSvgIcon-root': {
                    color: selectedItems.includes(habitacion.id) ? 'red' : 'white',
                  },
                  '&.Mui-checked': {
                    backgroundColor: 'none',
                  },
                }}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default RoomMatrix;
