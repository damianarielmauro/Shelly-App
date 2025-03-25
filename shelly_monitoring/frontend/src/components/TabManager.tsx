import React, { useState, useEffect } from 'react';
import { Tabs, Tab, TextField, Menu, MenuItem, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, Checkbox, Box, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getTableros, createTablero, updateTableroName, deleteTablero, getHabitaciones, createHabitacion, getHabitacionesByTablero } from '../services/api';
import { checkPermission } from '../services/auth';

interface Tab {
  id: number;
  nombre: string;
  habitaciones: { id: number; nombre: string; consumo: number }[];
}

interface User {
  permissions: string[];
}

interface TabManagerProps {
  selectedTab: number;
  setSelectedTab: React.Dispatch<React.SetStateAction<number>>;
  editMode: boolean;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setHabitaciones: React.Dispatch<React.SetStateAction<any[]>>;
  setTableros: React.Dispatch<React.SetStateAction<any[]>>;
  deleteMode: boolean;
  setDeleteMode: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteOptionSelect: (type: string) => void;
  selectedItems: number[];
  setSelectedItems: React.Dispatch<React.SetStateAction<number[]>>;
  deleteType: string;
  user: User;
  setRoomMatrixView: React.Dispatch<React.SetStateAction<boolean>>;
}

const TabManager: React.FC<TabManagerProps> = ({
  selectedTab, setSelectedTab, editMode, setEditMode, setHabitaciones,
  setTableros, deleteMode, setDeleteMode, handleDeleteOptionSelect,
  selectedItems, setSelectedItems, deleteType, user, setRoomMatrixView
}) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [habitaciones, setHabitacionesState] = useState<any[]>([]);
  const [renamingTab, setRenamingTab] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [newTableroNombre, setNewTableroNombre] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>('');
  const [newItemName, setNewItemName] = useState<string>('');

  useEffect(() => {
    const fetchTableros = async () => {
      try {
        const data = await getTableros();
        setTabs(data);
      } catch (error) {
        console.error('Error fetching tableros:', error);
      }
    };

    fetchTableros();
  }, []);

  useEffect(() => {
    const fetchHabitaciones = async () => {
      if (tabs.length > 0 && tabs[selectedTab]) {
        try {
          const data = await getHabitaciones();
          const filteredHabitaciones = data.filter((hab: any) => hab.tablero_id === tabs[selectedTab]?.id);
          setHabitaciones(filteredHabitaciones);
          setHabitacionesState(filteredHabitaciones);
        } catch (error) {
          console.error('Error fetching habitaciones:', error);
        }
      }
    };

    fetchHabitaciones();
  }, [selectedTab, tabs]);

  const handleTabChange = (event: React.SyntheticEvent | null, newValue: number) => {
    // Ya sea el mismo tablero u otro diferente, siempre establecemos roomMatrixView a true
    setRoomMatrixView(true);
    setSelectedTab(newValue);
  };

  const handleCreateTablero = async (nombre: string) => {
    if (!checkPermission(user, 'create_tablero')) {
      alert('No tienes permiso para crear tableros.');
      return;
    }
    await createTablero(nombre);
    const data = await getTableros();
    setTabs(data);
    setSelectedTab(data.length - 1);
  };

  const handleCreateHabitacion = async (nombre: string, tableroId: number) => {
    if (!checkPermission(user, 'create_habitacion')) {
      alert('No tienes permiso para crear habitaciones.');
      return;
    }
    await createHabitacion(nombre, tableroId);
    const data = await getHabitaciones();
    const filteredHabitaciones = data.filter((hab: any) => hab.tablero_id === tableroId);
    setHabitaciones(filteredHabitaciones);
    setHabitacionesState(filteredHabitaciones);
    const updatedTableros = await getTableros();
    setTabs(updatedTableros);
  };

  const handleRenameTablero = async (id: number, nombre: string) => {
    if (!checkPermission(user, 'rename_tablero')) {
      alert('No tienes permiso para renombrar tableros.');
      return;
    }
    await updateTableroName(id, nombre);
    const data = await getTableros();
    setTabs(data);
    setRenamingTab(null);
  };

  const handleDeleteTablero = async (id: number) => {
    if (!checkPermission(user, 'delete_tablero')) {
      alert('No tienes permiso para eliminar tableros.');
      return;
    }
    const habitacionesAsignadas = await getHabitacionesByTablero(id);
    if (habitacionesAsignadas.length > 0) {
      alert('El tablero ' + id + ' tiene habitaciones asignadas y no se puede borrar.');
      return;
    }
    await deleteTablero(id);
    const data = await getTableros();
    setTabs(data);
    if (selectedTab >= data.length) {
      setSelectedTab(data.length - 1);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDialogOpen = (type: string) => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setNewItemName('');
  };

  const handleDialogSubmit = () => {
    if (dialogType === 'Habitación') {
      handleCreateHabitacion(newItemName, tabs[selectedTab].id);
    } else if (dialogType === 'Tablero') {
      handleCreateTablero(newItemName);
    }
    handleDialogClose();
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          aria-label="tabs"
          sx={{
            '& .MuiTab-root': {
              color: 'white',
              display: 'flex',
              alignItems: 'center',
            },
            '& .Mui-selected': {
              color: 'blue',
              fontWeight: 'bold',
            },
            flexGrow: 1
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.id}
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {renamingTab === tab.id ? (
                    <TextField
                      value={tab.nombre}
                      onChange={(e) => setTabs(tabs.map(t => t.id === tab.id ? { ...t, nombre: e.target.value } : t))}
                      onBlur={() => handleRenameTablero(tab.id, tab.nombre)}
                      onKeyPress={(e) => { if (e.key === 'Enter') handleRenameTablero(tab.id, tab.nombre); }}
                      autoFocus
                    />
                  ) : (
                    <span onDoubleClick={() => setRenamingTab(tab.id)}>{tab.nombre}</span>
                  )}
                  {deleteMode && deleteType === 'Tablero' && (
                    <Checkbox
                      checked={selectedItems.includes(tab.id)}
                      onChange={() => setSelectedItems(
                        selectedItems.includes(tab.id)
                          ? selectedItems.filter(item => item !== tab.id)
                          : [...selectedItems, tab.id]
                      )}
                      sx={{
                        color: 'red',
                        '& .MuiSvgIcon-root': {
                          color: selectedItems.includes(tab.id) ? 'red' : 'red',
                        },
                        '&.Mui-checked': {
                          backgroundColor: 'none',
                        },
                      }}
                    />
                  )}
                </div>
              }
              value={index}
              onClick={() => setRoomMatrixView(true)} // Asegurar que también se establezca al hacer clic directamente
            />
          ))}
        </Tabs>
        {editMode && (
          <Tooltip title="Agregar" sx={{ marginLeft: 'auto' }}>
            <IconButton color="inherit" onClick={handleMenuClick}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleDialogOpen('Tablero')}>Tablero</MenuItem>
        <MenuItem onClick={() => handleDialogOpen('Habitación')}>Habitación</MenuItem>
      </Menu>
      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Agregar {dialogType}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Por favor ingresa el nombre del {dialogType.toLowerCase()}.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label={`Nombre del ${dialogType}`}
            type="text"
            fullWidth
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDialogSubmit} color="primary">
            Agregar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TabManager;
