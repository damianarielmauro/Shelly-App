import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Box, Card, Typography, TextField, IconButton, Tooltip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import BoltIcon from '@mui/icons-material/Bolt';
import HomeIcon from '@mui/icons-material/Home';
import DeleteIcon from '@mui/icons-material/Delete';

interface Habitacion {
  id: number;
  nombre: string;
  tablero_id: number;
  consumo: number;
  orden?: number;
}

interface Tablero {
  id: number;
  nombre: string;
}

interface DraggableRoomGridProps {
  habitaciones: Habitacion[];
  tableros: Tablero[];
  currentTableroId: number;
  editMode: boolean;
  onReorder: (newOrder: Habitacion[]) => void;
  onRename: (id: number, newName: string) => void;
  onChangeTablero: (habitacionId: number, tableroId: number) => void;
  onRoomClick: (habitacionId: number) => void;
  onDelete: (id: number, type: string) => void;
}

const DraggableRoomGrid: React.FC<DraggableRoomGridProps> = ({
  habitaciones,
  tableros,
  currentTableroId,
  editMode,
  onReorder,
  onRename,
  onChangeTablero,
  onRoomClick,
  onDelete,
}) => {
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [orderedRooms, setOrderedRooms] = useState<Habitacion[]>([]);

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
    console.log("Drag end result:", result);
    if (!result.destination) return;
    
    // Si el destino es otro tablero (arrastrar entre tableros)
    if (result.destination.droppableId !== result.source.droppableId) {
      // Extraer los IDs de las cadenas "tablero-X" y "habitacion-Y"
      const habitacionIdStr = result.draggableId.split('-')[1];
      const targetTableroIdStr = result.destination.droppableId.split('-')[1];
      
      if (!habitacionIdStr || !targetTableroIdStr) {
        console.error("No se pudieron extraer los IDs correctamente", {
          draggableId: result.draggableId,
          destinationDroppableId: result.destination.droppableId
        });
        return;
      }
      
      const habitacionId = parseInt(habitacionIdStr, 10);
      const targetTableroId = parseInt(targetTableroIdStr, 10);
      
      console.log(`Moviendo habitación ${habitacionId} al tablero ${targetTableroId}`);
      
      // Llamar a la función para cambiar de tablero
      onChangeTablero(habitacionId, targetTableroId);
      return;
    }
    
    // Si es reordenar dentro del mismo tablero
    const items = Array.from(orderedRooms);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Actualizar orden
    const newItems = items.map((item, index) => ({
      ...item,
      orden: index
    }));
    
    setOrderedRooms(newItems);
    onReorder(newItems);
  };

  const startRenaming = (id: number, currentName: string) => {
    setRenamingId(id);
    setNewName(currentName);
  };

  const handleRename = (id: number) => {
    if (newName.trim() !== '') {
      onRename(id, newName.trim());
      setRenamingId(null);
    }
  };

  // Filtrar tableros para mostrar solo los otros (no el actual)
  const otherTableros = tableros.filter(t => t.id !== currentTableroId);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Box display="flex" sx={{ width: '100%' }}>
        {/* Contenedor principal del tablero actual */}
        <Droppable 
          droppableId={`tablero-${currentTableroId}`} 
          direction="horizontal"
          type="habitacion"
        >
          {(provided, snapshot) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{ 
                display: 'flex', 
                flexWrap: 'wrap',
                gap: 0.5,
                flex: 1,
                padding: '8px',
                backgroundColor: snapshot.isDraggingOver ? 'rgba(30, 202, 255, 0.05)' : 'transparent',
                borderRadius: '4px',
              }}
              className={snapshot.isDraggingOver ? 'droppable-area active' : ''}
            >
              {orderedRooms.map((habitacion, index) => {
                const consumoFormateado =
                  habitacion.consumo < 1000
                    ? `${habitacion.consumo} W`
                    : `${(habitacion.consumo / 1000).toFixed(2)} kW`;
                
                return (
                  <Draggable
                    key={habitacion.id}
                    draggableId={`habitacion-${habitacion.id}`}
                    index={index}
                    isDragDisabled={!editMode}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        onClick={() => !editMode && onRoomClick(habitacion.id)}
                        sx={{
                          m: 0.5,
                          p: 1.5,
                          backgroundColor: '#333',
                          color: 'white',
                          width: '120px',
                          height: '100px',
                          textAlign: 'center',
                          borderRadius: '8px',
                          position: 'relative',
                          cursor: !editMode ? 'pointer' : 'default',
                          opacity: snapshot.isDragging ? 0.8 : 1,
                          boxShadow: snapshot.isDragging ? '0 5px 10px rgba(0,0,0,0.3)' : 'none',
                          transform: snapshot.isDragging ? 'scale(1.02)' : 'none',
                        }}
                        className={snapshot.isDragging ? 'dragging' : ''}
                      >
                        {editMode && (
                          <>
                            {/* Barra superior con ícono de arrastre e ícono de edición */}
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
                              <Tooltip title="Arrastrar para reordenar o mover a otro tablero">
                                <div {...provided.dragHandleProps} style={{ cursor: 'move' }} className="drag-handle">
                                  <DragIndicatorIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.7)' }} />
                                </div>
                              </Tooltip>
                              
                              {/* Ícono de edición (derecha) */}
                              <Tooltip title="Renombrar">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startRenaming(habitacion.id, habitacion.nombre);
                                  }}
                                  sx={{ color: 'rgba(255,255,255,0.7)', padding: '0' }}
                                  className="rename-button"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            
                            {/* Ícono de eliminar en la esquina inferior derecha */}
                            <Box sx={{ 
                              position: 'absolute', 
                              bottom: 0, 
                              right: 0,
                              padding: '2px' 
                            }}>
                              <Tooltip title="Eliminar">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(habitacion.id, 'Habitación');
                                  }}
                                  sx={{ color: 'rgba(255,0,0,0.7)', padding: '0' }}
                                  className="delete-button"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </>
                        )}

                        {renamingId === habitacion.id ? (
                          <TextField
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={() => handleRename(habitacion.id)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleRename(habitacion.id);
                            }}
                            autoFocus
                            size="small"
                            variant="standard"
                            sx={{
                              input: { color: 'white', textAlign: 'center' },
                              width: '100%',
                              marginTop: '20px',
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="rename-input"
                          />
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              height: '50%',
                              mb: 0.5,
                              marginTop: editMode ? '20px' : '0',
                            }}
                          >
                            {habitacion.nombre}
                          </Typography>
                        )}
                        
                        <Box display="flex" alignItems="center" justifyContent="center">
                          <BoltIcon sx={{ fontSize: '1rem', color: '#1976d2', mr: 0.5 }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              color: '#1976d2',
                            }}
                          >
                            {consumoFormateado}
                          </Typography>
                        </Box>
                      </Card>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
        
        {/* Si estamos en modo edición, también renderizamos áreas para otros tableros */}
        {editMode && otherTableros.length > 0 && (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            width: '140px',
            marginLeft: '10px',
            paddingTop: '8px',
            overflow: 'auto',
            maxHeight: 'calc(100vh - 200px)'
          }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#1ECAFF', 
                marginBottom: '10px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              Otros tableros:
            </Typography>
            
            {otherTableros.map(tablero => (
              <Droppable
                key={tablero.id}
                droppableId={`tablero-${tablero.id}`}
                type="habitacion"
              >
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      width: '120px',
                      minHeight: '100px',
                      margin: '0 auto 10px auto',
                      padding: '8px',
                      backgroundColor: snapshot.isDraggingOver ? 'rgba(30, 202, 255, 0.1)' : 'rgba(30, 30, 30, 0.5)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      border: snapshot.isDraggingOver ? '1px dashed #1ECAFF' : '1px dashed #555',
                      transition: 'all 0.3s ease',
                    }}
                    className={snapshot.isDraggingOver ? 'droppable-area active' : 'droppable-area'}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#1ECAFF', 
                        marginBottom: '8px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tablero.nombre}
                    </Typography>
                    
                    {!snapshot.isDraggingOver ? (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#888',
                          fontSize: '10px',
                          textAlign: 'center'
                        }}
                      >
                        Arrastra habitaciones aquí
                      </Typography>
                    ) : (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#1ECAFF',
                          fontSize: '10px',
                          textAlign: 'center'
                        }}
                      >
                        Soltar aquí
                      </Typography>
                    )}
                    
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            ))}
          </Box>
        )}
      </Box>
    </DragDropContext>
  );
};

export default DraggableRoomGrid;
