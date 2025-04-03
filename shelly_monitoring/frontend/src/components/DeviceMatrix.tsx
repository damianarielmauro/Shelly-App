import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, Checkbox, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio,
  IconButton, CircularProgress
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { getDispositivos, getHabitaciones, asignarHabitacion, toggleDevice } from '../services/api';
import {
  DispositivoConConsumo,
  obtenerDispositivosConConsumo,
  formatearConsumo,
  getColorForConsumo,
  iniciarActualizacionPeriodica,
  suscribirseADispositivosActualizados
} from '../services/consumptionService';

// Definimos un estilo global para las animaciones del botón de encendido
const globalStyles = `
  @keyframes ringAnimationOn {
    0% { transform: rotate(-90deg); opacity: 0; }
    100% { transform: rotate(0deg); opacity: 1; }
  }
  
  @keyframes ringAnimationOff {
    0% { transform: rotate(0deg); opacity: 1; }
    100% { transform: rotate(-90deg); opacity: 0; }
  }
  
  .power-ring-on {
    animation: ringAnimationOn 0.5s ease forwards;
  }
  
  .power-ring-off {
    animation: ringAnimationOff 0.5s ease forwards;
  }
`;

// Componente para el botón de encendido con animación
const PowerButton = ({ isOn, isLoading, onClick, isDisabled = false, deviceId }: { 
  isOn: boolean; 
  isLoading: boolean; 
  onClick: (id: number) => void;
  isDisabled?: boolean;
  deviceId: number;
}) => {
  // Ahora siempre mostramos el botón, pero lo deshabilitamos si el dispositivo está offline
  return (
    <IconButton
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation(); // Evitar propagación del evento
        e.preventDefault(); // Prevenir comportamiento por defecto
        onClick(deviceId); // Pasamos el ID del dispositivo explícitamente
      }}
      disabled={isLoading || isDisabled}
      size="small"
      sx={{
        position: 'relative',
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: isOn ? 'rgba(35, 145, 255, 0.1)' : 'rgba(51, 51, 51, 0.5)',
        '&:hover': {
          backgroundColor: isOn ? 'rgba(35, 145, 255, 0.2)' : 'rgba(51, 51, 51, 0.7)',
        },
        p: 0,
        // Si está deshabilitado, hacerlo más transparente
        opacity: isDisabled ? 0.5 : 1,
      }}
    >
      {isLoading ? (
        <CircularProgress
          size={24}
          sx={{
            color: '#2391FF',
          }}
        />
      ) : (
        <>
          <PowerSettingsNewIcon
            sx={{
              fontSize: '1rem',
              color: isOn ? '#2391FF' : '#999',
              transition: 'all 0.3s ease',
            }}
          />
          <Box
            className={isOn ? 'power-ring-on' : ''}
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              // Cambio: líneas blancas cuando está apagado
              border: `2px solid ${isOn ? '#2391FF' : 'white'}`, // Cambiado a blanco cuando está apagado
              transition: 'all 0.5s ease',
            }}
          />
        </>
      )}
    </IconButton>
  );
};

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
  const [loadingDevices, setLoadingDevices] = useState<{[key: number]: boolean}>({});

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
        
        // Forzar manualmente algunos dispositivos como online y otros offline para probar
        const datosModificados = sortedData.map((dispositivo, index) => {
          // Hacemos que los dispositivos con índice par sean online y los impares offline
          const isOnline = index % 2 === 0;
          const estado = isOnline ? (Math.random() > 0.5 ? 1 : 0) : 0; // Si está online, algunos encendidos otros apagados
          return {
            ...dispositivo,
            online: isOnline,
            estado: estado
          };
        });
        
        setDispositivos(datosModificados);
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

  // Manejador para el botón de encendido/apagado
  const handleToggleDevice = async (deviceId: number) => {
    console.log(`Toggling device with ID: ${deviceId}`); // Verificación en la consola
    
    try {
      setLoadingDevices(prev => ({ ...prev, [deviceId]: true }));
      await toggleDevice(deviceId);
      
      // Actualizamos SOLO el dispositivo específico que se cambió
      setDispositivos(prevDispositivos => {
        return prevDispositivos.map(disp => {
          if (disp.id === deviceId) {
            // Solo actualizamos el estado del dispositivo que cambió
            return { 
              ...disp, 
              estado: disp.estado ? 0 : 1 // Invertir estado
            };
          }
          return disp;
        });
      });
    } catch (error) {
      console.error('Error al cambiar estado del dispositivo:', error);
    } finally {
      setLoadingDevices(prev => ({ ...prev, [deviceId]: false }));
    }
  };

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
      // Ordenar habitaciones alfabéticamente como en UsersManagement
      const sortedHabitaciones = [...habitacionesData].sort((a, b) => 
        a.nombre.localeCompare(b.nombre)
      );
      setHabitaciones(sortedHabitaciones);
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
      
      // Mantener los mismos estados de online/offline que teníamos antes
      const datosModificados = sortedData.map((dispositivo, index) => {
        // Encontrar dispositivo previo para mantener estado online/offline
        const dispPrevio = dispositivos.find(d => d.id === dispositivo.id);
        const isOnline = dispPrevio ? dispPrevio.online : (index % 2 === 0);
        const estado = dispPrevio ? dispPrevio.estado : (isOnline ? (Math.random() > 0.5 ? 1 : 0) : 0);
        
        return {
          ...dispositivo,
          online: isOnline,
          estado: estado
        };
      });
      
      setDispositivos(datosModificados);
      setContadorAsignados(data.filter((d) => d.habitacion_id).length);
      setContadorSinAsignar(data.filter((d) => !d.habitacion_id).length);
    } catch (error) {
      console.error('Error al asignar habitación:', error);
    }
  };

  return (
    <>
      {/* Estilos globales para las animaciones */}
      <style>{globalStyles}</style>
      
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
            backgroundColor: '#2391FF',
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
          <Typography variant="body1" sx={{ color: '#2391FF', fontWeight: 'bold' }}>
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
            
            // Determinamos si el dispositivo está online
            const isOnline = Boolean(dispositivo.online);
            
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
                {/* Indicador de dispositivo offline ahora en la esquina superior derecha */}
                {!isOnline && (
                  <CloudOffIcon
                    sx={{
                      position: 'absolute',
                      top: '2px',
                      right: '6px', // Donde estaba el tilde antes
                      color: '#ff4444',
                      fontSize: '0.5rem' // Pequeño
                    }}
                  />
                )}
                
                {/* Indicador de dispositivo asignado a habitación ahora en la esquina inferior derecha */}
                {dispositivo.habitacion_id && (
                  <CheckCircleIcon
                    sx={{
                      position: 'absolute',
                      bottom: '2px', // Ajustado al borde inferior
                      right: '6px', // Alineado con la nube verticalmente
                      color: '#00FF00',
                      fontSize: '0.5rem' // Mismo tamaño que la nube
                    }}
                  />
                )}
                
                {/* Checkbox para seleccionar en modo edición */}
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
                
                {/* Nombre del dispositivo - Restaurado al estilo original */}
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
                    position: 'relative', // Para posicionar el botón
                    paddingRight: '40px', // Espacio para el botón
                  }}
                >
                  {dispositivo.nombre}
                </Typography>
                
                {/* Botón de encendido/apagado en posición absoluta para evitar solapamiento */}
                <Box sx={{ 
                  position: 'absolute',
                  right: '8px',
                  top: '10px', // Ajustado para centrar verticalmente
                }}>
                  <PowerButton 
                    isOn={Boolean(dispositivo.estado)} 
                    isLoading={loadingDevices[dispositivo.id] || false}
                    onClick={handleToggleDevice}
                    isDisabled={!isOnline} // Deshabilitado pero visible si está offline
                    deviceId={dispositivo.id} // Pasamos el ID del dispositivo al botón
                  />
                </Box>
                
                {/* Información de consumo - Centrada como el nombre */}
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  sx={{
                    // Mismo estilo de contenedor que el nombre para mantener alineación
                    paddingRight: '40px', // Espacio para el botón
                  }}
                >
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
        
        {/* Diálogo con el mismo estilo de UsersManagement.tsx */}
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
            color: '#2391FF', 
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}>
            Seleccionar habitación
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
                backgroundColor: '#2391FF',
                borderRadius: '10px',
              },
              pt: 1
            }}
          >
            <RadioGroup 
              value={selectedHabitacion} 
              onChange={handleHabitacionChange}
              sx={{ 
                '& .MuiFormControlLabel-root': {
                  marginBottom: '2px', // Reducir espacio entre opciones a la mitad
                }
              }}
            >
              <FormControlLabel 
                key="ninguna" 
                value="null" 
                control={
                  <Radio 
                    sx={{
                      color: 'white',
                      padding: '2px',
                      '&.Mui-checked': {
                        color: '#2391FF',
                      }
                    }} 
                  />
                } 
                label={
                  <Typography sx={{ 
                    color: 'white', 
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}>
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
                        padding: '2px',
                        '&.Mui-checked': {
                          color: '#2391FF',
                        }
                      }} 
                    />
                  } 
                  label={
                    <Typography sx={{ 
                      color: 'white', 
                      fontSize: '0.9rem' 
                    }}>
                      {habitacion.nombre}
                    </Typography>
                  }
                />
              ))}
            </RadioGroup>
          </DialogContent>
          <DialogActions sx={{ padding: '16px' }}>
            <Button 
              onClick={handleClose} 
              sx={{ 
                color: '#2391FF',
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
                backgroundColor: '#2391FF', 
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
    </>
  );
};

export default DeviceMatrix;
