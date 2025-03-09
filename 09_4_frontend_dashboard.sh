#!/bin/bash

echo "*****************************************"
echo "*        09_4_frontend_dashboard        *"
echo "*****************************************"


# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"

# Crear el archivo src/pages/Dashboard.tsx
cat <<'EOF' > src/pages/Dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, IconButton, Box, Tooltip, Menu, MenuItem, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RoomMatrix from '../components/RoomMatrix';
import TabManager from '../components/TabManager';
import DeviceList from '../components/DeviceList';
import { getHabitacionesByTablero, deleteTablero, deleteHabitacion, getTableros } from '../services/api';

const Dashboard = () => {
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [tableros, setTableros] = useState<any[]>([]);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteType, setDeleteType] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const fetchTableros = useCallback(async () => {
    try {
      const data = await getTableros();
      setTableros(data);
    } catch (error) {
      console.error('Error fetching tableros:', error);
    }
  }, []);

  const fetchHabitaciones = useCallback(async (tableroId: number) => {
    try {
      const data = await getHabitacionesByTablero(tableroId);
      setHabitaciones(data);
    } catch (error) {
      console.error('Error fetching habitaciones:', error);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchTableros();
      setLoading(false);
    };

    initialize();
  }, [fetchTableros]);

  useEffect(() => {
    if (tableros.length > 0 && tableros[selectedTab]) {
      fetchHabitaciones(tableros[selectedTab]?.id);
    }
  }, [selectedTab, tableros, fetchHabitaciones]);

  const handleDeleteSelectionChange = (id: number) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((itemId) => itemId !== id)
        : [...prevSelected, id]
    );
  };

  const handleDeleteOptionSelect = (type: string) => {
    setDeleteType(type);
    setDeleteMode(true);
    setAnchorEl(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleEditMode = () => {
    if (editMode) {
      setDeleteMode(false);
      setSelectedItems([]);
    }
    setEditMode(!editMode);
  };

  const handleDeleteAction = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (deleteMode) {
      setLoading(true);
      if (deleteType === 'Habitación') {
        for (const id of selectedItems) {
          await deleteHabitacion(id);
        }
        const newHabitaciones = habitaciones.filter(hab => !selectedItems.includes(hab.id));
        setHabitaciones(newHabitaciones);
        setSelectedItems([]);
        setDeleteMode(false);
      } else if (deleteType === 'Tablero') {
        const tablerosConHabitaciones = await Promise.all(selectedItems.map(async (id) => {
          const habitacionesAsignadas = await getHabitacionesByTablero(id);
          return habitacionesAsignadas.length > 0 ? id : null;
        }));

        const tablerosSinHabitaciones = selectedItems.filter(id => !tablerosConHabitaciones.includes(id));
        if (tablerosConHabitaciones.filter(Boolean).length > 0) {
          alert(`Algunos tableros tienen habitaciones asignadas y no se pueden borrar.`);
          setSelectedItems([]);
          setDeleteMode(false);
          setLoading(false);
          return;
        }

        for (const id of tablerosSinHabitaciones) {
          await deleteTablero(id);
        }
        await fetchTableros(); // Refetch tableros
        setSelectedItems([]);
        setDeleteMode(false);
      }
      setLoading(false);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  return (
    <Box sx={{ backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0 }}>
        <TabManager 
          selectedTab={selectedTab} 
          setSelectedTab={setSelectedTab} 
          editMode={editMode} 
          setEditMode={setEditMode} 
          setHabitaciones={setHabitaciones} 
          setTableros={setTableros}
          deleteMode={deleteMode}
          setDeleteMode={setDeleteMode} 
          handleDeleteOptionSelect={handleDeleteOptionSelect}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems} 
          deleteType={deleteType} 
        />
        <Box display="flex" alignItems="center" sx={{ marginLeft: 'auto', justifyContent: 'flex-end', alignItems: 'center' }}>
          {editMode && (
            <>
              <Tooltip title="Eliminar">
                <IconButton color={deleteMode && selectedItems.length > 0 ? "error" : "inherit"} onClick={handleDeleteAction}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={() => handleDeleteOptionSelect('Tablero')}>Tablero</MenuItem>
                <MenuItem onClick={() => handleDeleteOptionSelect('Habitación')}>Habitación</MenuItem>
              </Menu>
            </>
          )}
          <Tooltip title="Editar">
            <IconButton color={editMode ? "primary" : "inherit"} onClick={toggleEditMode}>
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
          {loading ? (
            <CircularProgress />
          ) : (
            <RoomMatrix 
              habitaciones={habitaciones} 
              deleteMode={deleteMode && deleteType === 'Habitación'} 
              selectedItems={selectedItems} 
              handleDeleteSelectionChange={handleDeleteSelectionChange} 
            />
          )}
        </Box>
        <Box sx={{ width: '300px', overflow: 'auto', p: 2 }}>
          <DeviceList />
        </Box>
      </Box>
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
