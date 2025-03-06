#!/bin/bash

echo "*****************************************"
echo "*        09_4_frontend_dashboard        *"
echo "*****************************************"


# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"


# Crear el archivo src/pages/Dashboard.tsx
cat <<'EOF' > src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, IconButton, Box, Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, Checkbox, FormControlLabel, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import RoomMatrix from '../components/RoomMatrix';
import DeviceList from '../components/DeviceList';
import TabManager from '../components/TabManager';
import { getHabitaciones, createHabitacion, deleteHabitacion } from '../services/api';

const Dashboard = () => {
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>('');
  const [newItemName, setNewItemName] = useState<string>('');
  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHabitaciones = async () => {
      try {
        const data = await getHabitaciones();
        setHabitaciones(data.filter((hab: any) => hab.tablero_id === selectedTab));
      } catch (error) {
        console.error('Error fetching habitaciones:', error);
      }
    };

    fetchHabitaciones();
  }, [selectedTab]);

  const handleCreateHabitacion = async (nombre: string, tableroId: number) => {
    await createHabitacion(nombre, tableroId);
    const data = await getHabitaciones();
    setHabitaciones(data.filter((hab: any) => hab.tablero_id === tableroId));
  };

  const handleDeleteHabitacion = async (id: number) => {
    await deleteHabitacion(id);
    const data = await getHabitaciones();
    setHabitaciones(data.filter((hab: any) => hab.tablero_id === selectedTab));
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
      handleCreateHabitacion(newItemName, selectedTab);
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

  return (
    <Box sx={{ backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0 }}>
        <TabManager selectedTab={selectedTab} setSelectedTab={setSelectedTab} editMode={editMode} setEditMode={setEditMode} />
        <Box display="flex">
          <Tooltip title="Editar">
            <IconButton color={editMode ? "primary" : "inherit"} onClick={() => setEditMode(!editMode)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <IconButton color="inherit" onClick={() => navigate('/consumption')}>
            <FlashOnIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => navigate('/statistics')}>
            <BarChartIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => navigate('/settings')}>
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: '#1976d2', width: '100%', flexShrink: 0 }} />
      <Box display="flex" sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <RoomMatrix habitaciones={habitaciones} />
        </Box>
        <Box sx={{ width: '300px', overflow: 'auto', p: 2 }}>
          <DeviceList />
        </Box>
      </Box>

      {deleteMode && (
        <div>
          {habitaciones.map((hab) => (
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
          <Button onClick={handleDeleteConfirmation} color="primary">
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
    </Box>
  );
};

export default Dashboard;
EOF


# Crear el archivo src/pages/Statistics.tsx
cat <<EOF > src/pages/Statistics.tsx
import React from 'react';

const Statistics = () => {
  return (
    <div>
      <h1>Statistics Page</h1>
      {/* Contenido de la página de estadísticas */}
    </div>
  );
};

export default Statistics;
EOF

# Crear el archivo src/pages/Consumption.tsx
cat <<EOF > src/pages/Consumption.tsx
import React from 'react';

const Consumption = () => {
  return (
    <div>
      <h1>Consumption Page</h1>
      {/* Contenido de la página de consumos */}
    </div>
  );
};

export default Consumption;
EOF

# Crear el archivo src/pages/Settings.tsx
cat <<EOF > src/pages/Settings.tsx
import React from 'react';

const Settings = () => {
  return (
    <div>
      <h1>Settings Page</h1>
      {/* Contenido de la página de configuración */}
    </div>
  );
};

export default Settings;
EOF
