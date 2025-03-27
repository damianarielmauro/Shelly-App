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
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    fetchDispositivos();
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
          backgroundColor: '#1ECAFF', // Actualizado para coincidir con el tema
          borderRadius: '3px',
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
          const consumo =
            dispositivo.ultimo_consumo < 1000
              ? `${dispositivo.ultimo_consumo} W`
              : `${(dispositivo.ultimo_consumo / 1000).toFixed(2)} kW`;

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
                <BoltIcon sx={{ fontSize: '0.75rem', color: '#1ECAFF', mr: 0.5 }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 'bold',
                    color: '#1ECAFF',
                  }}
                >
                  {consumo}
                </Typography>
              </Box>
            </Card>
          );
        })}
      </Box>
      {/* Diálogo rediseñado para coincidir con el estilo de UsersManagement */}
      <Dialog 
        open={open} 
        onClose={handleClose}
        PaperProps={{
          style: {
            backgroundColor: '#333',
            color: 'white',
            borderRadius: '10px',
            minWidth: '300px'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#1ECAFF', 
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}>
          Asignar a Habitación
        </DialogTitle>
        <DialogContent
          sx={{
            maxHeight: '600px',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#222',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#1ECAFF',
              borderRadius: '10px',
            },
            pt: 1
          }}
        >
          <Box display="flex" flexDirection="column">
            <RadioGroup value={selectedHabitacion} onChange={handleHabitacionChange}>
              <FormControlLabel 
                key="ninguna" 
                value="null" 
                control={
                  <Radio 
                    sx={{
                      color: 'white',
                      '&.Mui-checked': {
                        color: '#1ECAFF',
                      }
                    }} 
                  />
                } 
                label={
                  <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    Ninguna
                  </Typography>
                }
              />
              {habitaciones.map((habitacion) => (
                <FormControlLabel 
                  key={habitacion.id} 
                  value={habitacion.id.toString()} 
                  control={
                    <Radio 
                      sx={{
                        color: 'white',
                        '&.Mui-checked': {
                          color: '#1ECAFF',
                        }
                      }} 
                    />
                  } 
                  label={
                    <Typography sx={{ color: 'white', fontSize: '0.9rem' }}>
                      {habitacion.nombre}
                    </Typography>
                  }
                />
              ))}
            </RadioGroup>
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: '16px' }}>
          <Button 
            onClick={handleClose} 
            sx={{ 
              color: '#1ECAFF',
              '&:hover': {
                backgroundColor: 'rgba(30, 202, 255, 0.1)',
              }
            }}
          >
            CANCELAR
          </Button>
          <Button 
            onClick={handleAssign} 
            variant="contained" 
            sx={{ 
              backgroundColor: '#1ECAFF', 
              color: 'black',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#18b2e1',
              }
            }}
          >
            GUARDAR
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeviceMatrix;
