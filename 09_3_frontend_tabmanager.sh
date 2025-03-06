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
import { Tabs, Tab, TextField, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { getTableros, createTablero, updateTableroName, deleteTablero } from '../services/api';

interface TabManagerProps {
  selectedTab: number;
  setSelectedTab: (tab: number) => void;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
}

const TabManager: React.FC<TabManagerProps> = ({ selectedTab, setSelectedTab, editMode, setEditMode }) => {
  const [tabs, setTabs] = useState<{ id: number, nombre: string }[]>([]);
  const [renamingTab, setRenamingTab] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [newTableroNombre, setNewTableroNombre] = useState<string>('');

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleCreateTablero = async (nombre: string) => {
    await createTablero(nombre);
    const data = await getTableros();
    setTabs(data);
    setSelectedTab(data.length - 1); // Seleccionar el nuevo tablero creado
  };

  const handleCreateHabitacion = async (nombre: string) => {
    // Implementa la lógica para crear una habitación
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

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDialogOpen = (type: string) => {
    if (type === 'Tablero') {
      const nombre = prompt('Ingrese el nombre del nuevo tablero:');
      if (nombre) {
        handleCreateTablero(nombre);
      }
    } else if (type === 'Habitación') {
      const nombre = prompt('Ingrese el nombre de la nueva habitación:');
      if (nombre) {
        handleCreateHabitacion(nombre);
      }
    }
  };

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
              <IconButton color="inherit" onClick={() => handleDeleteTablero(tabs[selectedTab].id)}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      )}
    </>
  );
};

export default TabManager;
EOF
