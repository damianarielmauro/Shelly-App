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
import { Tabs, Tab, TextField, IconButton, Tooltip, Menu, MenuItem, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { getTableros, createTablero, updateTableroName, deleteTablero, getHabitaciones, createHabitacion, deleteHabitacion } from '../services/api';

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
  deleteMode: boolean;
  handleDeleteOptionSelect: (type: string) => void;
  selectedItems: number[];  // Añadimos selectedItems aquí
}

const TabManager: React.FC<TabManagerProps> = ({ selectedTab, setSelectedTab, editMode, setEditMode, setHabitaciones, deleteMode, handleDeleteOptionSelect, selectedItems }) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [habitaciones, setHabitacionesState] = useState<any[]>([]);
  const [renamingTab, setRenamingTab] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [newTableroNombre, setNewTableroNombre] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>('');
  const [newItemName, setNewItemName] = useState<string>('');
  const [deleteType, setDeleteType] = useState<string>('');

  useEffect(() => {
    const fetchTableros = async () => {
      try {
        const data = await getTableros();
        if (!data.find((tab: any) => tab.nombre === 'General')) {
          await createTablero('General');
        }
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
          console.log('Habitaciones obtenidas:', data);
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleCreateTablero = async (nombre: string) => {
    await createTablero(nombre);
    const data = await getTableros();
    setTabs(data);
    setSelectedTab(data.length - 1);
  };

  const handleCreateHabitacion = async (nombre: string, tableroId: number) => {
    await createHabitacion(nombre, tableroId);
    const data = await getHabitaciones();
    const filteredHabitaciones = data.filter((hab: any) => hab.tablero_id === tableroId);
    setHabitaciones(filteredHabitaciones);
    setHabitacionesState(filteredHabitaciones);
    const updatedTableros = await getTableros();
    setTabs(updatedTableros);
  };

  const handleRenameTablero = async (id: number, nombre: string) => {
    await updateTableroName(id, nombre);
    const data = await getTableros();
    setTabs(data);
    setRenamingTab(null);
  };

  const handleDeleteTablero = async (id: number) => {
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

  console.log('deleteMode:', deleteMode);
  console.log('selectedTab:', selectedTab);
  console.log('tabs[selectedTab]:', tabs[selectedTab]);
  console.log('habitaciones:', habitaciones);

  return (
    <>
      {/* Pestañas principales */}
      <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', flex: 1 }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          aria-label="tabs"
          sx={{
            '& .MuiTab-root': {
              color: 'white',
            },
            '& .Mui-selected': {
              color: 'blue',
              fontWeight: 'bold',
            },
          }}
        >
          {tabs.filter(tab => tab.nombre !== 'General').map((tab, index) => (
            <Tab
              key={tab.id}
              label={
                renamingTab === tab.id ? (
                  <TextField
                    value={tab.nombre}
                    onChange={(e) => setTabs(tabs.map(t => t.id === tab.id ? { ...t, nombre: e.target.value } : t))}
                    onBlur={() => handleRenameTablero(tab.id, tab.nombre)}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleRenameTablero(tab.id, tab.nombre); }}
                    autoFocus
                  />
                ) : (
                  <span onDoubleClick={() => setRenamingTab(tab.id)}>{tab.nombre}</span>
                )
              }
            />
          ))}
        </Tabs>
      </div>

      {/* Pestaña 'General' alineada a la derecha */}
      <div style={{  marginLeft: 'auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Tabs
          value={selectedTab === tabs.length ? selectedTab : false}
          onChange={handleTabChange}
          aria-label="general-tab"
          sx={{
            '& .MuiTab-root': {
              color: 'white',
            },
            '& .Mui-selected': {
              color: 'blue',
              fontWeight: 'bold',
            },
          }}
        >
          <Tab label="General" value={tabs.length} />
        </Tabs>
      </div>

      {editMode && (
        <div style={{ marginLeft: 'auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Tooltip title="Agregar">
              <IconButton color="inherit" onClick={handleMenuClick}>
                <AddIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => handleDialogOpen('Tablero')}>Tablero</MenuItem>
              <MenuItem onClick={() => handleDialogOpen('Habitación')}>Habitación</MenuItem>
            </Menu>
            <Tooltip title="Eliminar">
              <IconButton color={deleteMode && selectedItems.length > 0 ? "error" : "inherit"} onClick={() => handleDeleteOptionSelect('Habitación')}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Dialogo para agregar Habitación */}
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
