import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, Checkbox, Button, Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getDispositivos, getHabitaciones, asignarHabitacion } from '../services/api';

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
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [selectedHabitacion, setSelectedHabitacion] = useState<number | null>(null);

  const [contadorAsignados, setContadorAsignados] = useState(0);
  const [contadorSinAsignar, setContadorSinAsignar] = useState(0);

  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        const data = await getDispositivos();
        const sortedData = data.sort((a: any, b: any) => {
          if (a.habitacion_id && !b.habitacion_id) return 1;
          if (!a.habitacion_id && b.habitacion_id) return -1;
          return a.nombre.localeCompare(b.nombre);
        });
        setDispositivos(sortedData);
        setContadorAsignados(data.filter((d: any) => d.habitacion_id).length);
        setContadorSinAsignar(data.filter((d: any) => !d.habitacion_id).length);
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

  const handleAssignClick = async () => {
    try {
      const habitacionesData = await getHabitaciones();
      setHabitaciones(habitacionesData);
      setOpen(true);
    } catch (error) {
      console.error('Error al obtener las habitaciones:', error);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleHabitacionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedHabitacion(Number(event.target.value));
  };

  const handleAssign = async () => {
    if (selectedHabitacion !== null) {
      try {
        await asignarHabitacion(selectedItems, selectedHabitacion);
        setSelectedItems([]);
        setOpen(false);
        // Refetch dispositivos after assignment
        const data = await getDispositivos();
        const sortedData = data.sort((a: any, b: any) => {
          if (a.habitacion_id && !b.habitacion_id) return 1;
          if (!a.habitacion_id && b.habitacion_id) return -1;
          return a.nombre.localeCompare(b.nombre);
        });
        setDispositivos(sortedData);
        setContadorAsignados(data.filter((d: any) => d.habitacion_id).length);
        setContadorSinAsignar(data.filter((d: any) => !d.habitacion_id).length);
      } catch (error) {
        console.error('Error al asignar habitación:', error);
      }
    }
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
        justifyContent="flex-end"
        sx={{ mb: 2, pr: 4 }} // Ajustar justificación y padding-right para mover el contador a la izquierda
      >
        <Typography variant="body1" sx={{ color: '#00FF00' }}> {/* Cambiar a verde brillante */}
          Asignados: {contadorAsignados}
        </Typography>
        <Typography variant="body1" sx={{ color: 'white', mx: 1 }}>
          - Sin Asignar: {contadorSinAsignar}
        </Typography>
        <Typography variant="body1" sx={{ color: '#1976d2', fontWeight: 'bold' }}> {/* Cambiar a azul usado en otros lugares de la página */}
          - Totales: {dispositivos.length}
        </Typography>
      </Box>
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
              {dispositivo.habitacion_id && (
                <CheckCircleIcon
                  sx={{
                    position: 'absolute',
                    top: '2px', // Ajustar posición superior
                    right: '2px', // Ajustar posición derecha
                    color: '#00FF00', // Cambiar a un verde más brillante
                  }}
                />
              )}
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
  <DialogTitle sx={{ fontSize: '1rem' }}>Asignar a Habitación</DialogTitle>
  <DialogContent
    sx={{
      fontSize: '0.4rem',
      lineHeight: '0.6rem',
      maxHeight: '600px', // Aumentar la altura máxima del contenido del dialog
      overflowY: 'auto', // Habilitar el scroll vertical
      '&::-webkit-scrollbar': {
        width: '4px', // Hacer el scrollbar lo más fino posible
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: 'white', // Fondo blanco para el track del scrollbar
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#1976d2', // Barra del scrollbar de color azul
        borderRadius: '10px', // Redondear un poco la barra
      },
    }}
  >
    <RadioGroup value={selectedHabitacion?.toString()} onChange={handleHabitacionChange}>
      {habitaciones.map((habitacion) => (
        <FormControlLabel 
          key={habitacion.id} 
          value={habitacion.id.toString()} 
          control={<Radio sx={{ padding: '2px' }} />} 
          label={
            <Box sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
              {habitacion.nombre}
            </Box>
          }
        />
      ))}
    </RadioGroup>
  </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleAssign} color="primary">
            Asignar
    </Button>
  </DialogActions>
</Dialog>

    </Box>
  );
};

export default DeviceMatrix;
