import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, Checkbox, Button, Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { getDispositivosByHabitacion } from '../services/api';

interface RoomDeviceMatrixProps {
  habitacionId: number;
  editMode: boolean;
}

const RoomDeviceMatrix: React.FC<RoomDeviceMatrixProps> = ({ habitacionId, editMode }) => {
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        const data = await getDispositivosByHabitacion(habitacionId);
        setDispositivos(data);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    fetchDispositivos();
  }, [habitacionId]);

  const handleCheckboxChange = (id: number) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((itemId) => itemId !== id)
        : [...prevSelected, id]
    );
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      sx={{
        overflowY: 'scroll',
        height: 'calc(100vh - 85px)', // Ajustar la altura para el scroll
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'black',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#1976d2',
        },
      }}
    >
      <Box
        display="flex"
        flexWrap="wrap"
        gap={1}
      >
        {dispositivos.map((dispositivo) => {
          const consumo =
            dispositivo.consumo < 1000
              ? `${dispositivo.consumo} W`
              : `${(dispositivo.consumo / 1000).toFixed(2)} kW`;

          return (
            <Card
              key={dispositivo.id}
              sx={{
                m: 1,
                p: 2,
                backgroundColor: '#333',
                color: 'white',
                width: '240px', // Doble de ancho
                height: '50px', // Mitad de alto
                textAlign: 'center',
                borderRadius: '8px',
                position: 'relative',
              }}
            >
              {editMode && (
                <Checkbox
                  checked={selectedItems.includes(dispositivo.id)}
                  onChange={() => handleCheckboxChange(dispositivo.id)}
                  sx={{
                    position: 'absolute',
                    bottom: '-5px',
                    right: '-5px',
                    color: 'red',
                    '& .MuiSvgIcon-root': {
                      color: selectedItems.includes(dispositivo.id) ? 'red' : 'red',
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
                  fontSize: '0.6rem', // Reducir tamaño del texto
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
                <BoltIcon sx={{ fontSize: '0.75rem', color: '#1976d2', mr: 0.5 }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.6rem', // Reducir tamaño del texto
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
    </Box>
  );
};

export default RoomDeviceMatrix;
