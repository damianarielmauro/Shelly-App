import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  TextField,
  Divider,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import SearchIcon from '@mui/icons-material/Search';
import DoneIcon from '@mui/icons-material/Done';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getFirmwareUpdateDetails, updateFirmware } from '../services/firmwareService';
import { FirmwareUpdate } from '../types/firmware';

interface FirmwareUpdatePanelProps {
  updates: FirmwareUpdate[];
}

const FirmwareUpdatePanel: React.FC<FirmwareUpdatePanelProps> = ({ updates }) => {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [firmwareDetails, setFirmwareDetails] = useState<{[key: string]: any}>({});
  const [selectedDevices, setSelectedDevices] = useState<{[key: string]: number[]}>({});
  const [isUpdating, setIsUpdating] = useState<{[key: string]: boolean}>({});
  const [progress, setProgress] = useState<{[key: string]: number}>({});
  const [filter, setFilter] = useState<{[key: string]: string}>({});
  
  const handleExpandModel = (modelId: string) => async () => {
    if (expandedModel === modelId) {
      setExpandedModel(null);
      return;
    }
    
    setExpandedModel(modelId);
    
    if (!firmwareDetails[modelId]) {
      try {
        const details = await getFirmwareUpdateDetails(modelId);
        setFirmwareDetails(prev => ({...prev, [modelId]: details}));
        // Seleccionar todos los dispositivos por defecto
        setSelectedDevices(prev => ({
          ...prev, 
          [modelId]: details.devices.map((device: any) => device.id)
        }));
        setFilter(prev => ({...prev, [modelId]: ''}));
      } catch (error) {
        console.error('Error al obtener detalles:', error);
      }
    }
  };

  const handleSelectAllDevices = (modelId: string) => {
    if (firmwareDetails[modelId]) {
      setSelectedDevices(prev => ({
        ...prev,
        [modelId]: firmwareDetails[modelId].devices.map((device: any) => device.id)
      }));
    }
  };

  const handleDeselectAllDevices = (modelId: string) => {
    setSelectedDevices(prev => ({
      ...prev,
      [modelId]: []
    }));
  };

  const toggleDeviceSelection = (modelId: string, deviceId: number) => {
    setSelectedDevices(prev => {
      const currentSelected = prev[modelId] || [];
      return {
        ...prev,
        [modelId]: currentSelected.includes(deviceId)
          ? currentSelected.filter(id => id !== deviceId)
          : [...currentSelected, deviceId]
      };
    });
  };

  const startUpdate = async (modelId: string) => {
    if (!firmwareDetails[modelId] || !selectedDevices[modelId]?.length) return;
    
    setIsUpdating(prev => ({...prev, [modelId]: true}));
    
    try {
      const modelDevices = firmwareDetails[modelId].devices;
      const selectedIds = selectedDevices[modelId];
      
      // Actualizar el estado de los dispositivos seleccionados a "updating"
      const updatedDevices = modelDevices.map((device: any) => ({
        ...device,
        status: selectedIds.includes(device.id) ? 'updating' : device.status
      }));
      
      setFirmwareDetails(prev => ({
        ...prev, 
        [modelId]: {...prev[modelId], devices: updatedDevices}
      }));
      
      // Llamar al servicio de actualización
      await updateFirmware(modelId, selectedIds, (status, completedCount) => {
        // Actualizar progreso
        setProgress(prev => ({
          ...prev,
          [modelId]: Math.round((completedCount / selectedIds.length) * 100)
        }));
        
        // Actualizar estado de dispositivos
        setFirmwareDetails(prev => {
          if (!prev[modelId]) return prev;
          
          const updatedDevices = prev[modelId].devices.map((device: any) => {
            if (selectedIds.includes(device.id)) {
              const deviceStatus = status.find(s => s.deviceId === device.id);
              if (deviceStatus) {
                return {
                  ...device,
                  status: deviceStatus.success ? 'completed' : 'failed',
                  message: deviceStatus.message
                };
              }
            }
            return device;
          });
          
          return {
            ...prev,
            [modelId]: {...prev[modelId], devices: updatedDevices}
          };
        });
      });
      
    } catch (error) {
      console.error('Error al actualizar firmware:', error);
    } finally {
      setIsUpdating(prev => ({...prev, [modelId]: false}));
    }
  };

  const getFilteredDevices = (modelId: string) => {
    if (!firmwareDetails[modelId]) return [];
    
    const searchTerm = (filter[modelId] || '').toLowerCase();
    return firmwareDetails[modelId].devices.filter((device: any) => {
      return device.nombre.toLowerCase().includes(searchTerm) || 
             (device.habitacion_nombre && device.habitacion_nombre.toLowerCase().includes(searchTerm));
    });
  };

  if (updates.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography sx={{ color: '#aaa', textAlign: 'center' }}>
          No hay actualizaciones de firmware disponibles en este momento.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
        Actualizaciones de Firmware Disponibles
      </Typography>
      
      {updates.map((update) => (
        <Accordion
          key={update.modelId}
          expanded={expandedModel === update.modelId}
          onChange={handleExpandModel(update.modelId)}
          sx={{
            backgroundColor: '#222',
            color: 'white',
            mb: 1,
            '&.Mui-expanded': {
              mb: 2,
            },
            '&:before': {
              display: 'none',
            },
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#2391FF' }} />}
            sx={{ 
              borderBottom: expandedModel === update.modelId ? '1px solid #333' : 'none',
              '&:hover': {
                backgroundColor: 'rgba(35, 145, 255, 0.05)',
              }
            }}
          >
            <Box display="flex" alignItems="center" width="100%">
              <SystemUpdateAltIcon sx={{ color: '#2391FF', mr: 2 }} />
              <Box flexGrow={1}>
                <Typography sx={{ fontWeight: 'bold' }}>
                  {update.modelName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#aaa' }}>
                  v{update.currentVersion} → v{update.newVersion} ({update.deviceCount} dispositivos)
                </Typography>
              </Box>
              <Chip
                label="Nueva versión"
                size="small"
                sx={{
                  backgroundColor: 'rgba(35, 145, 255, 0.2)',
                  color: '#2391FF',
                  height: '22px',
                  fontSize: '0.7rem'
                }}
              />
            </Box>
          </AccordionSummary>
          
          <AccordionDetails sx={{ p: 0 }}>
            {firmwareDetails[update.modelId] ? (
              <Box>
                <Box p={2} sx={{ backgroundColor: '#333' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2, 
                          backgroundColor: 'rgba(35, 145, 255, 0.05)', 
                          borderRadius: '8px',
                          height: '100%'
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Versión Actual: <span style={{ color: '#aaa' }}>{update.currentVersion}</span>
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Nueva Versión: <span style={{ color: '#2391FF' }}>{update.newVersion}</span>
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                          Fecha de Lanzamiento: <span style={{ color: '#aaa' }}>{update.releaseDate}</span>
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          backgroundColor: '#222',
                          height: '100%',
                          borderRadius: '8px',
                          border: '1px solid #444'
                        }}
                      >
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                          Notas de la Versión:
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#ccc' }}>
                          {firmwareDetails[update.modelId].releaseNotes}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
                
                <Divider sx={{ borderColor: '#444' }} />
                
                <Box p={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Dispositivos ({getFilteredDevices(update.modelId).length})
                    </Typography>
                    
                    <Box>
                      <Button 
                        size="small"
                        onClick={() => handleSelectAllDevices(update.modelId)}
                        sx={{ 
                          mr: 1, 
                          color: '#2391FF',
                          '&:hover': {
                            backgroundColor: 'rgba(35, 145, 255, 0.1)',
                          }
                        }}
                      >
                        Seleccionar Todos
                      </Button>
                      <Button 
                        size="small"
                        onClick={() => handleDeselectAllDevices(update.modelId)}
                        sx={{ 
                          color: '#999',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          }
                        }}
                      >
                        Deseleccionar Todos
                      </Button>
                    </Box>
                  </Box>
                  
                  <Box mb={2} sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#222', borderRadius: '4px', px: 1 }}>
                    <SearchIcon sx={{ color: '#666', mr: 1 }} />
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Buscar por nombre o habitación..."
                      value={filter[update.modelId] || ''}
                      onChange={(e) => setFilter(prev => ({...prev, [update.modelId]: e.target.value}))}
                      variant="standard"
                      InputProps={{
                        disableUnderline: true,
                        style: { color: 'white' }
                      }}
                      sx={{
                        '& .MuiInputBase-root': {
                          height: '40px',
                        }
                      }}
                    />
                  </Box>
                  
                  <List sx={{ 
                    maxHeight: '250px', 
                    overflow: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: '#222',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: '#2391FF',
                      borderRadius: '10px',
                    } 
                  }}>
                    {getFilteredDevices(update.modelId).map((device: any) => (
                      <ListItem 
                        key={device.id}
                        sx={{ 
                          borderBottom: '1px solid #444',
                          backgroundColor: selectedDevices[update.modelId]?.includes(device.id) ? 'rgba(35, 145, 255, 0.05)' : 'transparent',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)'
                          },
                          borderRadius: '4px',
                          mb: 0.5
                        }}
                      >
                        <ListItemIcon>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedDevices[update.modelId]?.includes(device.id) || false}
                                onChange={() => toggleDeviceSelection(update.modelId, device.id)}
                                disabled={isUpdating[update.modelId] || device.status === 'updating'}
                                sx={{
                                  color: '#666',
                                  '&.Mui-checked': {
                                    color: '#2391FF',
                                  }
                                }}
                              />
                            }
                            label=""
                            sx={{ m: 0 }}
                          />
                        </ListItemIcon>
                        
                        <ListItemText 
                          primary={device.nombre} 
                          secondary={device.habitacion_nombre || "Sin asignar"}
                          primaryTypographyProps={{ sx: { color: 'white', fontWeight: 'medium' } }}
                          secondaryTypographyProps={{ sx: { color: '#999' } }}
                        />
                        
                        {device.status !== 'pending' && (
                          <Box display="flex" alignItems="center">
                            {device.status === 'updating' && (
                              <Chip 
                                icon={<HourglassEmptyIcon />} 
                                label="Actualizando..." 
                                size="small"
                                sx={{ 
                                  backgroundColor: 'rgba(255, 193, 7, 0.2)',
                                  color: '#FFC107',
                                  borderRadius: '4px',
                                  '& .MuiChip-icon': {
                                    color: '#FFC107'
                                  }
                                }}
                              />
                            )}
                            {device.status === 'completed' && (
                              <Chip 
                                icon={<CheckCircleIcon />} 
                                label="Completado" 
                                size="small"
                                sx={{ 
                                  backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                  color: '#4CAF50',
                                  borderRadius: '4px',
                                  '& .MuiChip-icon': {
                                    color: '#4CAF50'
                                  }
                                }}
                              />
                            )}
                            {device.status === 'failed' && (
                              <Chip 
                                icon={<ErrorIcon />} 
                                label="Error" 
                                size="small"
                                sx={{ 
                                  backgroundColor: 'rgba(244, 67, 54, 0.2)',
                                  color: '#F44336',
                                  borderRadius: '4px',
                                  '& .MuiChip-icon': {
                                    color: '#F44336'
                                  }
                                }}
                                title={device.message}
                              />
                            )}
                          </Box>
                        )}
                      </ListItem>
                    ))}
                  </List>
                  
                  {isUpdating[update.modelId] && (
                    <Box mt={2}>
                      <Typography variant="body2" sx={{ mb: 1, color: '#2391FF', fontWeight: 'bold' }}>
                        Progreso de la actualización: {progress[update.modelId] || 0}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={progress[update.modelId] || 0}
                        sx={{
                          backgroundColor: 'rgba(35, 145, 255, 0.2)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: '#2391FF'
                          },
                          height: 8,
                          borderRadius: 4
                        }}
                      />
                    </Box>
                  )}
                  
                  <Box display="flex" justifyContent="flex-end" mt={2}>
                    <Button
                      variant="contained"
                      startIcon={<SystemUpdateAltIcon />}
                      onClick={() => startUpdate(update.modelId)}
                      disabled={!selectedDevices[update.modelId]?.length || isUpdating[update.modelId]}
                      sx={{ 
                        backgroundColor: '#2391FF',
                        color: 'black',
                        fontWeight: 'bold',
                        '&:hover': {
                          backgroundColor: '#1884e8',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: 'rgba(35, 145, 255, 0.3)',
                          color: 'rgba(0, 0, 0, 0.5)'
                        }
                      }}
                    >
                      {isUpdating[update.modelId] ? (
                        <Box display="flex" alignItems="center">
                          Actualizando... <DoneIcon sx={{ ml: 1, fontSize: '1rem' }} />
                        </Box>
                      ) : (
                        `Actualizar ${selectedDevices[update.modelId]?.length || 0} ${selectedDevices[update.modelId]?.length === 1 ? 'dispositivo' : 'dispositivos'}`
                      )}
                    </Button>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={24} sx={{ color: '#2391FF' }} />
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default FirmwareUpdatePanel;
