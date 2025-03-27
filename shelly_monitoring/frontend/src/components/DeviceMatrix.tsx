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
  // Nuevas propiedades para manejar la comunicación con el componente padre
  onSelectedItemsChange?: (devices: number[]) => void; // Función para notificar cambios en los dispositivos seleccionados
  showRoomDialog?: boolean; // Controla si se muestra el diálogo de habitaciones
  setShowRoomDialog?: React.Dispatch<React.SetStateAction<boolean>>; // Actualiza el estado del diálogo
}

const DeviceMatrix: React.FC<DeviceMatrixProps> = ({ 
  user, 
  editMode, 
  onSelectedItemsChange, 
  showRoomDialog = false, 
  setShowRoomDialog 
}) => {
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [selectedHabitacion, setSelectedHabitacion] = useState<string>("null");

  const [contadorAsignados, setContadorAsignados] = useState(0);
  const [contadorSinAsignar, setContadorSinAsignar] = useState(0);
  
  // Nuevo estado para manejar los consumos de los dispositivos
  const [consumosDispositivos, setConsumosDispositivos] = useState<{[key: number]: number}>({});

  // Efecto para obtener los dispositivos
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
        
        // Inicializar consumos aleatorios para cada dispositivo
        const consumos: {[key: number]: number} = {};
        sortedData.forEach((dispositivo: any) => {
          consumos[dispositivo.id] = Math.floor(Math.random() * (3578 - 7 + 1)) + 7;
        });
        setConsumosDispositivos(consumos);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    fetchDispositivos();
    
    // Actualizar consumos cada 2 segundos, similar a DeviceList
    const intervalo = setInterval(() => {
      // Actualizar consumos individuales
      setConsumosDispositivos(prev => {
        const nuevosConsumos: {[key: number]: number} = {};
        Object.keys(prev).forEach(id => {
          nuevosConsumos[Number(id)] = Math.floor(Math.random() * (3578 - 7 + 1)) + 7;
        });
        return nuevosConsumos;
      });
    }, 2000);
    
    // Limpiar el intervalo al desmontar
    return () => clearInterval(intervalo);
  }, []);

  // Efecto para notificar al componente padre sobre cambios en los elementos seleccionados
  useEffect(() => {
    if (onSelectedItemsChange) {
      onSelectedItemsChange(selectedItems);
    }
  }, [selectedItems, onSelectedItemsChange]);

  // Efecto para controlar el diálogo desde el componente padre
  useEffect(() => {
    if (showRoomDialog && !open) {
      handleAssignClick();
    }
  }, [showRoomDialog]);

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
    // Si el diálogo se está controlando desde el componente padre, actualizamos su estado
    if (setShowRoomDialog) {
      setShowRoomDialog(false);
    }
  };

  const handleHabitacionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedHabitacion(event.target.value);
  };

  const handleAssign = async () => {
    try {
      const habitacionId = selectedHabitacion === "null" ? null : parseInt(selectedHabitacion as string);
      await asignarHabitacion(selectedItems, habitacionId);
      setSelectedItems([]);
      setOpen(false);
      // Si el diálogo se está controlando desde el componente padre, actualizamos su estado
      if (setShowRoomDialog) {
        setShowRoomDialog(false);
      }
      
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
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      sx={{
        overflowY: 'scroll',
        height: 'calc(100vh - 85px)',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'black',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#1ECAFF',
        },
      }}
    >
      <Box
        display="flex"
        justifyContent="flex-end"
        sx={{ mb: 2, pr: 4 }}
      >
        <Typography variant="body1" sx={{ color: '#00FF00' }}>
          Asignados: {contadorAsignados}
        </Typography>
        <Typography variant="body1" sx={{ color: 'white', mx: 1 }}>
          - Sin Asignar: {contadorSinAsignar}
        </Typography>
        <Typography variant="body1" sx={{ color: '#1ECAFF', fontWeight: 'bold' }}>
          - Totales: {dispositivos.length}
        </Typography>
      </Box>
      <Box
        display="flex"
        flexWrap="wrap"
        gap={0.5} // Reducido de 1 a 0.5 (de 8px a 4px)
      >
        {dispositivos.map((dispositivo) => {
          // Usar el consumo del estado en lugar del dispositivo directamente
          const consumo = consumosDispositivos[dispositivo.id] || 0;
          const formattedConsumo = 
            consumo < 1000
              ? `${consumo} W`
              : `${(consumo / 1000).toFixed(2)} kW`;
          
          // Determinar el color según el consumo
          const consumoColor = consumo >= 0 ? '#1ECAFF' : '#00ff00';

          return (
            <Card
              key={dispositivo.id}
              sx={{
                m: 0.5, // Reducido de 1 a 0.5 (de 8px a 4px)
                p: 1.5, // Reducido de 2 a 1.5 (de 16px a 12px)
                backgroundColor: '#333',
                color: 'white',
                width: '240px',
                height: '50px',
                textAlign: 'center',
                borderRadius: '8px',
                position: 'relative',
              }}
            >
              {dispositivo.habitacion_id && (
                <CheckCircleIcon
                  sx={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    color: '#00FF00',
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
                  fontSize: '0.6rem',
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
                <BoltIcon sx={{ fontSize: '0.75rem', color: consumoColor, mr: 0.5 }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 'bold',
                    color: consumoColor,
                  }}
                >
                  {formattedConsumo}
                </Typography>
              </Box>
            </Card>
          );
        })}
      </Box>
      {editMode && selectedItems.length > 0 && !showRoomDialog && (
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
            maxHeight: '600px', 
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'white',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#1ECAFF',
              borderRadius: '10px',
            },
          }}
        >
          <RadioGroup value={selectedHabitacion} onChange={handleHabitacionChange}>
            <FormControlLabel 
              key="ninguna" 
              value="null" 
              control={<Radio sx={{ padding: '2px' }} />} 
              label={
                <Box sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                  Ninguna
                </Box>
              }
            />
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
