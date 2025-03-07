#!/bin/bash

echo "*****************************************"
echo "*        09_4_frontend_dashboard        *"
echo "*****************************************"


# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"

# Crear el archivo src/pages/Dashboard.tsx
cat <<'EOF' > src/pages/Dashboard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, IconButton, Box, Tooltip, Button } from '@mui/material';  // Añadimos Button aquí
import EditIcon from '@mui/icons-material/Edit';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import RoomMatrix from '../components/RoomMatrix';
import DeviceList from '../components/DeviceList';
import TabManager from '../components/TabManager';

const Dashboard = () => {
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const navigate = useNavigate();

  const handleDeleteSelectionChange = (id: number) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((itemId) => itemId !== id)
        : [...prevSelected, id]
    );
  };

  const handleDeleteOptionSelect = (type: string) => {
    setDeleteMode(true);
  };

  const handleDeleteHabitacion = () => {
    // Aquí puedes agregar la lógica para eliminar las habitaciones seleccionadas
    // y actualizar el estado de las habitaciones y selectedItems.
    // Por ejemplo:
    const newHabitaciones = habitaciones.filter(hab => !selectedItems.includes(hab.id));
    setHabitaciones(newHabitaciones);
    setSelectedItems([]);
    setDeleteMode(false);
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
          deleteMode={deleteMode}
          handleDeleteOptionSelect={handleDeleteOptionSelect}
          selectedItems={selectedItems}  // Pasamos selectedItems como prop
        />
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
          <RoomMatrix 
            habitaciones={habitaciones} 
            deleteMode={deleteMode} 
            selectedItems={selectedItems} 
            handleDeleteSelectionChange={handleDeleteSelectionChange} 
          />
          {deleteMode && selectedItems.length > 0 && (
            <Button onClick={handleDeleteHabitacion} color="error">
              Confirmar Eliminación
            </Button>
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
