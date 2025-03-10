#!/bin/bash

echo "*****************************************"
echo "*        09_3_frontend_tabmanager       *"
echo "*****************************************"


# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"


# Crear el archivo src/components/TabManager.tsx
cat <<'EOF' > src/components/TabManager.tsx
import React, { useState, useEffect } from 'react';
import { Tabs, Tab, TextField, Menu, MenuItem, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, 
Button, Checkbox, Box, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getTableros, createTablero, updateTableroName, deleteTablero, getHabitaciones, createHabitacion, getHabitacionesByTablero } from '../services/api';

interface Tab {
  id: number;
  nombre: string;
  habitaciones: { id: number; nombre: string, consumo: number }[];
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
}

const TabManager: React.FC<TabManagerProps> = ({ selectedTab, setSelectedTab, editMode, setEditMode, setHabitaciones,
 setTableros, deleteMode, setDeleteMode, handleDeleteOptionSelect, selectedItems, setSelectedItems, deleteType }) => 
{
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
        if (!data.find((tab: any) => tab.nombre === 'General')) {
          await createTablero('General');
        }
        console.log("Tableros fetched:", data);
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
          console.log(`Habitaciones fetched for tablero ID ${tabs[selectedTab]?.id}:`, filteredHabitaciones);
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
    console.log(`Tab changed to index: ${newValue}, Tab ID: ${tabs[newValue]?.id}`);
    setSelectedTab(newValue);
    if (tabs[newValue]?.nombre === 'General') {
      setHabitaciones([]);
      setHabitacionesState([]);
    }
  };

  const handleCreateTablero = async (nombre: string) => {
    await createTablero(nombre);
    const data = await getTableros();
    setTabs(data);
    setSelectedTab(data.length - 1);
    console.log("New Tablero created and selected:", data[data.length - 1]);
  };

  const handleCreateHabitacion = async (nombre: string, tableroId: number) => {
    await createHabitacion(nombre, tableroId);
    const data = await getHabitaciones();
    const filteredHabitaciones = data.filter((hab: any) => hab.tablero_id === tableroId);
    setHabitaciones(filteredHabitaciones);
    setHabitacionesState(filteredHabitaciones);
    const updatedTableros = await getTableros();
    setTabs(updatedTableros);
    console.log(`New Habitacion created in Tablero ID ${tableroId}:`, filteredHabitaciones);
  };

  const handleRenameTablero = async (id: number, nombre: string) => {
    await updateTableroName(id, nombre);
    const data = await getTableros();
    setTabs(data);
    setRenamingTab(null);
    console.log(`Tablero ID ${id} renamed to ${nombre}`);
  };

  const handleDeleteTablero = async (id: number) => {
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
    console.log(`Tablero ID ${id} deleted`);
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
            flexGrow: 1 // Ensure the tabs take up all available space
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
EOF
