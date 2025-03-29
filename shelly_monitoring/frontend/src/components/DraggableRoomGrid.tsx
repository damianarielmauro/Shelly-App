import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Box, Typography, Card, IconButton, Tooltip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import BoltIcon from '@mui/icons-material/Bolt';
import { formatearConsumo, getColorForConsumo, HabitacionConConsumo } from '../services/consumptionService';

// Interfaz para Tablero
export interface Tablero {
  id: number;
  nombre: string;
}

// Interfaz para Habitacion (usada en onReorder)
export interface Habitacion {
  id: number;
  nombre: string;
  tablero_id: number;
  orden?: number;
}

interface DraggableRoomGridProps {
  habitaciones: HabitacionConConsumo[];
  editMode: boolean;
  onReorder: (newOrder: Habitacion[]) => void;
  onRoomClick?: (habitacionId: number) => void;
  // Propiedades adicionales que se están pasando desde el componente padre
  tableros?: Tablero[];
  currentTableroId?: number;
  onRename?: (id: number, newName: string) => Promise<void>;
  onChangeTablero?: (habitacionId: number, tableroId: number) => Promise<void>;
  onDelete?: (id: number, type: string) => void; // Actualizamos para que coincida con handleShowDeleteConfirm
}

const DraggableRoomGrid: React.FC<DraggableRoomGridProps> = ({
  habitaciones,
  editMode,
  onReorder,
  onRoomClick,
  // No usamos estas propiedades en este componente,
  // pero las añadimos para evitar el error de TypeScript
  tableros,
  currentTableroId,
  onRename,
  onChangeTablero,
  onDelete,
}) => {
  const [orderedRooms, setOrderedRooms] = useState<HabitacionConConsumo[]>([]);

  // Ordenar habitaciones por el campo orden si existe
  useEffect(() => {
    const sorted = [...habitaciones].sort((a, b) => {
      if (a.orden !== undefined && b.orden !== undefined) {
        return a.orden - b.orden;
      }
      return 0;
    });
    setOrderedRooms(sorted);
  }, [habitaciones]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    // Reordenar dentro del mismo contenedor
    const items = Array.from(orderedRooms);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Actualizar orden
    const newItems = items.map((item, index) => ({
      ...item,
      orden: index
    }));
    
    setOrderedRooms(newItems);
    
    // Convertir a tipo Habitacion para onReorder
    const habitacionesActualizadas = newItems.map(item => ({
      id: item.id,
      nombre: item.nombre,
      tablero_id: item.tablero_id,
      orden: item.orden
    }));
    
    onReorder(habitacionesActualizadas);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable 
        droppableId="habitaciones" 
        direction="vertical"
        type="habitacion"
      >
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              padding: '8px',
              backgroundColor: snapshot.isDraggingOver ? 'rgba(30, 202, 255, 0.05)' : 'transparent',
              borderRadius: '4px',
              width: '100%',
            }}
            className={snapshot.isDraggingOver ? 'droppable-area active' : ''}
          >
            {orderedRooms.map((habitacion, index) => {
              const consumoFormateado = formatearConsumo(habitacion.consumo);
              const consumoColor = getColorForConsumo(habitacion.consumo);
              
              return (
                <Draggable
                  key={habitacion.id}
                  draggableId={`habitacion-${habitacion.id}`}
                  index={index}
                  isDragDisabled={!editMode}
                >
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      onClick={() => onRoomClick && onRoomClick(habitacion.id)}
                      sx={{
                        width: '100%',
                        marginBottom: '4px',
                        cursor: onRoomClick ? 'pointer' : 'default',
                      }}
                    >
                      <Card
                        sx={{
                          p: 1.5,
                          backgroundColor: '#1A1A1A',
                          color: 'white',
                          width: '100%',
                          maxWidth: '300px',
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
                            <Tooltip title="Arrastrar para reordenar">
                              <div {...provided.dragHandleProps} style={{ cursor: 'move' }} className="drag-handle">
                                <DragIndicatorIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.7)' }} />
                              </div>
                            </Tooltip>
                          </Box>
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
                          {habitacion.nombre}
                        </Typography>
                        
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

export default DraggableRoomGrid;
