import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, Checkbox, Button, Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getDispositivos, getHabitaciones, asignarHabitacion } from '../services/api';
import {
  DispositivoConConsumo,
  obtenerDispositivosConConsumo,
  formatearConsumo,
  getColorForConsumo,
  iniciarActualizacionPeriodica,
  suscribirseADispositivosActualizados
} from '../services/consumptionService';

interface DeviceMatrixProps {
  user: {
    permissions: string[];
  };
  editMode: boolean;
  // Propiedades para manejar la comunicación con el componente padre
  onSelectedItemsChange?: (devices: number[]) => void;
  showRoomDialog?: boolean;
  setShowRoomDialog?: React.Dispatch<React.SetStateAction<boolean>>;
}

const DeviceMatrix: React.FC<DeviceMatrixProps> = ({ 
  user, 
  editMode, 
  onSelectedItemsChange, 
  showRoomDialog = false, 
  setShowRoomDialog 
}) => {
  const [dispositivos, setDispositivos] = useState<DispositivoConConsumo[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [selectedHabitacion, setSelectedHabitacion] = useState<string>("null");
  const [contadorAsignados, setContadorAsignados] = useState(0);
  const [contadorSinAsignar, setContadorSinAsignar] = useState(0);

  // Efecto para obtener los dispositivos usando el servicio centralizado
  useEffect(() => {
    // Iniciar el servicio de actualización periódica
    iniciarActualizacionPeriodica();

    const fetchDispositivos = async () => {
      try {
        // Obtener dispositivos con sus consumos del servicio centralizado
        const data = await obtenerDispositivosConConsumo();
        
        // Ordenar los dispositivos como antes
        const sortedData = data.sort((a, b) => {
          if (a.habitacion_id && !b.habitacion_id) return 1;
          if (!a.habitacion_id && b.habitacion_id) return -1;
          return a.nombre.localeCompare(b.nombre);
        });
        
        setDispositivos(sortedData);
        setContadorAsignados(data.filter((d) => d.habitacion_id).length);
        setContadorSinAsignar(data.filter((d) => !d.habitacion_id).length);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    fetchDispositivos();

    // Suscribirse a actualizaciones de dispositivos
    const unsuscribir = suscribirseADispositivosActualizados(async () => {
      await fetchDispositivos();
    });

    return () => {
      // Limpiar suscripción al desmontar
      unsuscribir();
    };
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
      const data = await obtenerDispositivosConConsumo(true); // Forzar refresco
      
      const sortedData = data.sort((a, b) => {
        if (a.habitacion_id && !b.habitacion_id) return 1;
        if (!a.habitacion_id && b.habitacion_id) return -1;
        return a.nombre.localeCompare(b.nombre);
      });
      
      setDispositivos(sortedData);
      setContadorAsignados(data.filter((d) => d.habitacion_id).length);
      setContadorSinAsignar(data.filter((d) => !d.habitacion_id).length);
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
        gap={0.5}
      >
        {dispositivos.map((dispositivo) => {
          // Usar las funciones de formateo del servicio centralizado
          const formattedConsumo = formatearConsumo(dispositivo.consumo);
          const consumoColor = getColorForConsumo(dispositivo.consumo);

          return (
            <Card
              key={dispositivo.id}
              sx={{
                m: 0.5,
                p: 1.5,
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
