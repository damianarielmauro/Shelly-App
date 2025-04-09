import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Box, Typography, Card, IconButton, TextField, Tooltip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import BoltIcon from '@mui/icons-material/Bolt';
import { 
  formatearConsumo,
  getColorForConsumo
} from '../services/consumptionService';
import { Dispositivo } from '../services/DeviceStateService';

// Extendemos el tipo Dispositivo para incluir la propiedad orden
interface DispositivoConOrden extends Dispositivo {
  orden?: number;
}

// Modificado para usar DispositivoConOrden
interface DraggableDeviceGridProps {
  dispositivos: Dispositivo[];
  editMode: boolean;
  onReorder: (newOrder: Dispositivo[]) => void;
}

const DraggableDeviceGrid: React.FC<DraggableDeviceGridProps> = ({
  dispositivos,
  editMode,
  onReorder,
}) => {
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [orderedDevices, setOrderedDevices] = useState<DispositivoConOrden[]>([]);

  // Ordenar dispositivos por el campo orden si existe
  useEffect(() => {
    // Tratar los dispositivos como DispositivoConOrden
    const sorted = [...dispositivos].sort((a, b) => {
      const aOrden = (a as DispositivoConOrden).orden;
      const bOrden = (b as DispositivoConOrden).orden;
      
      if (aOrden !== undefined && bOrden !== undefined) {
        return aOrden - bOrden;
      }
      return 0;
    });
    setOrderedDevices(sorted as DispositivoConOrden[]);
  }, [dispositivos]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    // Reordenar dentro del mismo contenedor
    const items = Array.from(orderedDevices);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Actualizar orden
    const newItems = items.map((item: DispositivoConOrden, index: number) => ({
      ...item,
      orden: index
    }));
    
    setOrderedDevices(newItems);
    onReorder(newItems);
  };

  const startRenaming = (id: number, currentName: string) => {
    setRenamingId(id);
    setNewName(currentName);
  };

  const handleRename = (id: number) => {
    // En una implementación completa, aquí iría una llamada API para renombrar
    // Por ahora solo actualizamos el estado local
    if (newName.trim() !== '') {
      const updatedDevices = orderedDevices.map((device: DispositivoConOrden) =>
        device.id === id ? { ...device, nombre: newName.trim() } : device
      );
      setOrderedDevices(updatedDevices);
      setRenamingId(null);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable 
        droppableId="dispositivos" 
        direction="vertical" // Cambiado a vertical para permitir mejor control del reordenamiento
        type="dispositivo"
      >
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{ 
              display: 'flex',  // Mantenemos flexbox
              flexDirection: 'column', // Pero cambiamos a columna para mejor control 
              gap: 1,
              padding: '8px',
              backgroundColor: snapshot.isDraggingOver ? 'rgba(30, 202, 255, 0.05)' : 'transparent',
              borderRadius: '4px',
              width: '100%',
            }}
            className={snapshot.isDraggingOver ? 'droppable-area active' : ''}
          >
            {orderedDevices.map((dispositivo: DispositivoConOrden, index: number) => {
              const consumoFormateado = formatearConsumo(dispositivo.consumo);
              const consumoColor = getColorForConsumo(dispositivo.consumo);
              
              return (
                <Draggable
                  key={dispositivo.id}
                  draggableId={`dispositivo-${dispositivo.id}`}
                  index={index}
                  isDragDisabled={!editMode}
                >
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{
                        width: '100%', // Ocupar todo el ancho disponible
                        marginBottom: '4px', // Espacio entre dispositivos
                      }}
                    >
                      <Card
                        sx={{
                          p: 1.5,
                          backgroundColor: '#333',
                          color: 'white',
                          width: '100%',
                          maxWidth: '300px', // Limitar el ancho máximo
                          height: '50px',
                          textAlign: 'center',
                          borderRadius: '8px',
                          position: 'relative',
                          opacity: snapshot.isDragging ? 0.8 : 1,
                          boxShadow: snapshot.isDragging ? '0 5px 10px rgba(0,0,0,0.3)' : 'none',
                          transform: snapshot.isDragging ? 'scale(1.02)' : 'none',
                          transition: 'box-shadow 0.2s, transform 0.2s',
                          mx: 'auto', // Centrar horizontalmente
                        }}
                        className={snapshot.isDragging ? 'dragging' : ''}
                      >
                        {editMode && (
                          <Box sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0,
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '2px' 
                          }}>
                            {/* Ícono de arrastre (izquierda) */}
                            <Tooltip title="Arrastrar para reordenar">
                              <div {...provided.dragHandleProps} style={{ cursor: 'move' }} className="drag-handle">
                                <DragIndicatorIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.7)' }} />
                              </div>
                            </Tooltip>
                            
                            {/* Ícono de edición (derecha) - desactivado por ahora */}
                            {/* 
                            <Tooltip title="Renombrar">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRenaming(dispositivo.id, dispositivo.nombre);
                                }}
                                sx={{ color: 'rgba(255,255,255,0.7)', padding: '0' }}
                                className="rename-button"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            */}
                          </Box>
                        )}

                        {renamingId === dispositivo.id ? (
                          <TextField
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={() => handleRename(dispositivo.id)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleRename(dispositivo.id);
                            }}
                            autoFocus
                            size="small"
                            variant="standard"
                            sx={{
                              input: { color: 'white', textAlign: 'center' },
                              width: '100%',
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="rename-input"
                          />
                        ) : (
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
                        )}
                        
                        <Box display="flex" alignItems="center" justifyContent="center">
                          <BoltIcon sx={{ 
                            fontSize: '0.75rem',
                            color: consumoColor,
                            mr: 0.5 
                          }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.6rem',
                              fontWeight: 'bold',
                              color: consumoColor,
                            }}
                          >
                            {consumoFormateado}
                          </Typography>
                        </Box>
                      </Card>
                    </Box>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default DraggableDeviceGrid;
