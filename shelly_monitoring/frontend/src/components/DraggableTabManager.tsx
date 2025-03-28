import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Box, Tab, IconButton, TextField, Tooltip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Tablero {
  id: number;
  nombre: string;
}

interface DraggableTabManagerProps {
  tableros: Tablero[];
  selectedTab: number;
  setSelectedTab: React.Dispatch<React.SetStateAction<number>>;
  editMode: boolean;
  onRename: (id: number, newName: string) => void;
  onReorder: (newOrder: Tablero[]) => void;
  setRoomMatrixView: React.Dispatch<React.SetStateAction<boolean>>;
  onDelete: (id: number, type: string) => void;
}

const DraggableTabManager: React.FC<DraggableTabManagerProps> = ({
  tableros,
  selectedTab,
  setSelectedTab,
  editMode,
  onRename,
  onReorder,
  setRoomMatrixView,
  onDelete
}) => {
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [newName, setNewName] = useState<string>('');

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(tableros);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Si se mueve el tablero seleccionado, actualizar selectedTab
    if (result.source.index === selectedTab) {
      setSelectedTab(result.destination.index);
    }
    // Si se mueve un tablero hacia la posición seleccionada
    else if (result.destination.index === selectedTab) {
      setSelectedTab(result.source.index < selectedTab ? selectedTab - 1 : selectedTab + 1);
    }
    
    onReorder(items);
  };

  const handleClick = (index: number) => {
    setSelectedTab(index);
    setRoomMatrixView(true);
  };
  
  const startRenaming = (id: number, currentName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setRenamingId(id);
    setNewName(currentName);
  };
  
  const handleRename = (id: number) => {
    if (newName.trim() !== '') {
      onRename(id, newName.trim());
      setRenamingId(null);
    }
  };

  const handleDeleteClick = (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete(id, 'Tablero');
  };
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="droppable-tabs" direction="horizontal">
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              display: 'flex',
              paddingLeft: '8px',
              overflow: 'auto',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': {
                display: 'none'
              }
            }}
          >
            {tableros.map((tablero, index) => (
              <Draggable
                key={tablero.id}
                draggableId={`tab-${tablero.id}`}
                index={index}
                isDragDisabled={!editMode}
              >
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    sx={{
                      backgroundColor: index === selectedTab ? '#333' : 'transparent',
                      borderBottom: index === selectedTab ? '3px solid #1ECAFF' : 'none',
                      color: index === selectedTab ? '#1ECAFF' : 'white',
                      padding: '8px 16px',
                      margin: '0 2px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px 4px 0 0',
                      cursor: 'pointer',
                      minWidth: renamingId === tablero.id ? '150px' : 'auto',
                      position: 'relative'
                    }}
                    onClick={() => handleClick(index)}
                  >
                    {editMode && (
                      <Tooltip title="Arrastrar para reordenar">
                        <div {...provided.dragHandleProps} style={{ marginRight: '4px', cursor: 'move' }}>
                          <DragIndicatorIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.7)' }} />
                        </div>
                      </Tooltip>
                    )}
                    
                    {renamingId === tablero.id ? (
                      <TextField
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={() => handleRename(tablero.id)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleRename(tablero.id);
                        }}
                        autoFocus
                        size="small"
                        variant="standard"
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          input: { color: 'white' },
                          width: '120px',
                        }}
                      />
                    ) : (
                      <Box sx={{ paddingRight: editMode ? '48px' : '0' }}>
                        {tablero.nombre}
                      </Box>
                    )}
                    
                    {editMode && renamingId !== tablero.id && (
                      <Box sx={{ position: 'absolute', right: '4px', display: 'flex' }}>
                        <Tooltip title="Renombrar">
                          <IconButton
                            size="small"
                            onClick={(e) => startRenaming(tablero.id, tablero.nombre, e)}
                            sx={{ color: 'rgba(255,255,255,0.7)', padding: '2px' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            onClick={(e) => handleDeleteClick(tablero.id, e)}
                            sx={{ color: 'rgba(255,0,0,0.7)', padding: '2px' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default DraggableTabManager;
