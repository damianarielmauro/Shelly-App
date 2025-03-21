import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, Checkbox, Button, Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { getDispositivos, asignarHabitacion } from '../services/api';

interface DeviceMatrixProps {
  user: {
    permissions: string[];
  };
  editMode: boolean;
}

const DeviceMatrix: React.FC<DeviceMatrixProps> = ({ user, editMode }) => {
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        const data = await getDispositivos();
        setDispositivos(data);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    fetchDispositivos();
  }, []);

  const handleCheckboxChange = (id: number) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((itemId) => itemId !== id)
        : [...prevSelected, id]
    );
  };

  const handleAssignClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAssign = async (habitacionId: number) => {
    try {
      await asignarHabitacion(selectedItems, habitacionId);
      setSelectedItems([]);
      setOpen(false);
    } catch (error) {
      console.error('Error al asignar habitación:', error);
    }
  };

  return (
    <Box
      display="flex"
      flexWrap="wrap"
      gap={1}
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
      {editMode && selectedItems.length > 0 && (
        <Button
          variant="contained"
          color="primary"
          onClick={handleAssignClick}
          sx={{ position: 'fixed', bottom: '725px', right: '98px', height: '25px', zIndex: 1000 }}
        >
          Asignar a Habitación
        </Button>
      )}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Asignar a Habitación</DialogTitle>
        <DialogContent>
          <RadioGroup>
            {/* Aquí debes mapear las habitaciones disponibles */}
            <FormControlLabel value="1" control={<Radio />} label="Habitación 1" />
            <FormControlLabel value="2" control={<Radio />} label="Habitación 2" />
            {/* Añade más habitaciones según sea necesario */}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancelar
          </Button>
          <Button onClick={() => handleAssign(1)} color="primary">
            Asignar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeviceMatrix;
