#!/bin/bash

echo "*****************************************"
echo "*        08_2_frontend_tableros         *"
echo "*****************************************"


# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"

# Crear la estructura de directorios si no existen
mkdir -p src/components/Tabs src/components/Tableros src/components/RoomMatrix src/components/DeviceList src/pages src/styles


# Crear el archivo src/components/Tabs/TabComponent.tsx
cat <<EOL > src/components/Tabs/TabComponent.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Tabs, Tab, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import { getTableros } from '../../services/api';

const TabComponent = () => {
  const [tabs, setTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTableros = async () => {
      try {
        const data = await getTableros();
        setTabs(data.map((tablero: any) => tablero.nombre));
      } catch (error) {
        console.error('Error fetching tableros:', error);
      }
    };

    fetchTableros();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  return (
    <div>
      <AppBar position="static" style={{ backgroundColor: 'black' }}>
        <Tabs value={selectedTab} onChange={handleTabChange} aria-label="tabs">
          {tabs.map((tab, index) => (
            <Tab label={tab} key={index} />
          ))}
        </Tabs>
        <div style={{ marginLeft: 'auto', display: 'flex' }}>
          <IconButton color="inherit"><EditIcon /></IconButton>
          <IconButton color="inherit"><FlashOnIcon /></IconButton>
          <IconButton color="inherit"><BarChartIcon /></IconButton>
          <IconButton color="inherit" onClick={handleSettingsClick}><SettingsIcon /></IconButton>
        </div>
      </AppBar>
      {/* Renderizar la matrix de habitaciones y otros componentes aquí */}
    </div>
  );
};

export default TabComponent;
EOL

# Crear el archivo src/components/Tableros/TablerosComponent.tsx
cat <<EOL > src/components/Tableros/TablerosComponent.tsx
import React, { useState, useEffect } from 'react';
import { getTableros, createTablero, deleteTablero, updateOrdenTableros } from '../../services/api';
import { TextField, List, ListItem, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const TablerosComponent = () => {
  const [tableros, setTableros] = useState<{ id: number; nombre: string }[]>([]);
  const [newTableroNombre, setNewTableroNombre] = useState('');

  useEffect(() => {
    const fetchTableros = async () => {
      const data = await getTableros();
      setTableros(data);
    };

    fetchTableros();
  }, []);

  const handleCreateTablero = async () => {
    if (newTableroNombre.trim()) {
      await createTablero(newTableroNombre);
      setNewTableroNombre('');
      const data = await getTableros();
      setTableros(data);
    }
  };

  const handleDeleteTablero = async (id: number) => {
    await deleteTablero(id);
    const data = await getTableros();
    setTableros(data);
  };

  return (
    <div>
      <h2>Tableros</h2>
      <TextField
        label="Nombre del Tablero"
        value={newTableroNombre}
        onChange={(e) => setNewTableroNombre(e.target.value)}
      />
      <IconButton onClick={handleCreateTablero}>
        <AddIcon />
      </IconButton>
      <List>
        {tableros.map((tablero) => (
          <ListItem key={tablero.id}>
            <ListItemText primary={tablero.nombre} />
            <IconButton edge="end" onClick={() => handleDeleteTablero(tablero.id)}>
              <DeleteIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default TablerosComponent;
EOL

# Crear el archivo src/pages/Dashboard.tsx
cat <<EOL > src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Tabs, Tab, IconButton, Box, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import { getTableros, getHabitaciones, getDispositivos } from '../services/api';
import RoomMatrix from '../components/RoomMatrix';
import DeviceList from '../components/DeviceList';

const Dashboard = () => {
  const [tabs, setTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTableros = async () => {
      try {
        const data = await getTableros();
        setTabs(data.map((tablero: any) => tablero.nombre));
      } catch (error) {
        console.error('Error fetching tableros:', error);
      }
    };

    fetchTableros();
  }, []);

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

  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        const data = await getDispositivos();
        setDispositivos(data);
      } catch (error) {
        console.error('Error fetching dispositivos:', error);
      }
    };

    fetchDispositivos();
  }, [selectedTab]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const handleConsumptionClick = () => {
    navigate('/consumption');
  };

  const handleStatisticsClick = () => {
    navigate('/statistics');
  };

  return (
    <Box sx={{ backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0 }}>
        <Tabs value={selectedTab} onChange={handleTabChange} aria-label="tabs" sx={{ color: 'white', fontSize: '1.25rem' }}>
          {tabs.map((tab, index) => (
            <Tab label={tab} key={index} sx={{ color: 'white', fontWeight: selectedTab === index ? 'bold' : 'normal' }} />
          ))}
        </Tabs>
        <Box display="flex">
          <IconButton color="inherit"><EditIcon /></IconButton>
          <IconButton color="inherit" onClick={handleConsumptionClick}><FlashOnIcon /></IconButton>
          <IconButton color="inherit" onClick={handleStatisticsClick}><BarChartIcon /></IconButton>
          <IconButton color="inherit" onClick={handleSettingsClick}><SettingsIcon /></IconButton>
        </Box>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: '#1976d2', width: '100%', flexShrink: 0 }} />
      <Box display="flex" sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <RoomMatrix habitaciones={habitaciones} />
        </Box>
        <Box sx={{ width: '300px', overflow: 'auto', p: 2 }}>
          <DeviceList dispositivos={dispositivos} />
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
EOL

