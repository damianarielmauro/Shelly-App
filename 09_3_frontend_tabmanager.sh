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
import { Tabs, Tab, TextField, IconButton, Tooltip, Menu, MenuItem, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, Checkbox, FormControlLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { getTableros, createTablero, updateTableroName, deleteTablero, getHabitaciones, createHabitacion, deleteHabitacion } from '../services/api';

interface Tab {
  id: number;
  nombre: string;
  habitaciones: { id: number; nombre: string }[];
}

interface TabManagerProps {
  selectedTab: number;
  setSelectedTab: React.Dispatch<React.SetStateAction<number>>;
  editMode: boolean;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setHabitaciones: React.Dispatch<React.SetStateAction<any[]>>;
}

const TabManager: React.FC<TabManagerProps> = ({ selectedTab, setSelectedTab, editMode, setEditMode, setHabitaciones }) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [renamingTab, setRenamingTab] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [newTableroNombre, setNewTableroNombre] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>('');
  const [newItemName, setNewItemName] = useState<string>('');
  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [deleteType, setDeleteType] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

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
          setHabitaciones(data.filter((hab: any) => hab.tablero_id === tabs[selectedTab]?.id));
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
    setSelectedTab(data.length - 1); // Seleccionar el nuevo tablero creado
  };

  const handleCreateHabitacion = async (nombre: string, tableroId: number) => {
    await createHabitacion(nombre, tableroId);
    const data = await getHabitaciones();
    setHabitaciones(data.filter((hab: any) => hab.tablero_id === tableroId));
    // Actualizar los tableros para reflejar la nueva habitación
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
      setSelectedTab(data.length - 1); // Ajustar el índice de la pestaña seleccionada si es necesario
    }
  };

  const handleDeleteHabitacion = async (id: number) => {
    await deleteHabitacion(id);
    const data = await getHabitaciones();
    setHabitaciones(data.filter((hab: any) => hab.tablero_id === tabs[selectedTab]?.id));
    // Actualizar los tableros para reflejar la eliminación de la habitación
    const updatedTableros = await getTableros();
    setTabs(updatedTableros);
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

  const handleDeleteModeToggle = () => {
    setDeleteMode(!deleteMode);
    setSelectedItems([]);
  };

  const handleDeleteSelectionChange = (id: number) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((itemId) => itemId !== id)
        : [...prevSelected, id]
    );
  };

  const handleDeleteConfirmation = async () => {
    for (const id of selectedItems) {
      await handleDeleteHabitacion(id);
    }
    setDeleteMode(false);
    setSelectedItems([]);
  };

  const handleDeleteMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, type: string) => {
    setMenuAnchorEl(event.currentTarget);
    setDeleteType(type);
  };

  const handleDeleteMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleDeleteOptionSelect = (type: string) => {
    setDeleteType(type);
    setMenuAnchorEl(null);
    setDeleteMode(true);
  };

  // Agregar logs de depuración
  console.log('deleteMode:', deleteMode);
  console.log('deleteType:', deleteType);
  console.log('selectedTab:', selectedTab);
  console.log('tabs[selectedTab]:', tabs[selectedTab]);
  console.log('habitaciones:', tabs[selectedTab]?.habitaciones);

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
          value={selectedTab === tabs.length ? selectedTab : false} // Si es la última pestaña, seleccionamos 'General'
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
              <IconButton color={deleteMode && selectedItems.length > 0 ? "error" : "inherit"} onClick={(event) => handleDeleteMenuOpen(event, 'delete')}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleDeleteMenuClose}
            >
              <MenuItem onClick={() => handleDeleteOptionSelect('Tablero')}>Tablero</MenuItem>
              <MenuItem onClick={() => handleDeleteOptionSelect('Habitación')}>Habitación</MenuItem>
            </Menu>
          </div>
        </div>
      )}

      {/* Mostrar cuadros de selección en modo eliminación */}
      {deleteMode && deleteType === 'Habitación' && tabs[selectedTab] && (
        <div>
          {tabs[selectedTab]?.habitaciones?.map((hab) => (
            <FormControlLabel
              key={hab.id}
              control={
                <Checkbox
                  checked={selectedItems.includes(hab.id)}
                  onChange={() => handleDeleteSelectionChange(hab.id)}
                />
              }
              label={hab.nombre}
            />
          ))}
          <Button onClick={handleDeleteConfirmation} color={selectedItems.length > 0 ? "error" : "primary"}>
            Confirmar Eliminación
          </Button>
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
