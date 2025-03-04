#!/bin/bash

echo "*****************************************"
echo "*        08_3_frontend_tableros         *"
echo "*****************************************"

# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"

# Crear el archivo src/components/RoomMatrix.tsx
cat <<EOF > src/components/RoomMatrix.tsx
import React, { useState, useEffect } from 'react';
import { IconButton, Grid, Paper } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { getHabitaciones } from '../../services/api';

const RoomMatrix = ({ tableroId }: { tableroId: number }) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [editMode, setEditMode] = useState<boolean>(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await getHabitaciones();
        setRooms(data.filter((room: any) => room.tablero_id === tableroId));
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };

    fetchRooms();
  }, [tableroId]);

  const handleEditClick = () => {
    setEditMode(!editMode);
  };

  return (
    <div>
      <IconButton color="primary" onClick={handleEditClick} style={{ float: 'right' }}>
        <EditIcon />
      </IconButton>
      <Grid container spacing={2}>
        {rooms.map((room, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <Paper style={{ padding: 16, textAlign: 'center' }}>
              {editMode ? (
                <input type="text" value={room.nombre} onChange={(e) => { /* handle name change */ }} />
              ) : (
                <span>{room.nombre}</span>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default RoomMatrix;
EOF


# Crear el archivo src/components/DeviceList.tsx
cat <<'EOL' > src/components/DeviceList.tsx
import React from 'react';
import { Box, List, ListItem, Typography } from '@mui/material';

const DeviceList = ({ dispositivos }: { dispositivos: any[] }) => {
  const totalConsumo = -12800; // Ejemplo en W (-12.8 kW)
  const consumoColor = totalConsumo >= 0 ? '#1976d2' : '#00ff00'; // Verde más intenso y brillante
  const formattedConsumo = totalConsumo < 1000 && totalConsumo > -1000 ? `${totalConsumo} W` : `${(totalConsumo / 1000).toFixed(2)} kW`;
  const consumoLabel = totalConsumo >= 0 ? 'Consumo Total' : 'Generación Total';

  return (
    <Box sx={{ backgroundColor: '#333', borderRadius: '8px', color: 'white', width: '300px', maxWidth: '300px', height: 'calc(100vh - 100px)', overflowY: 'auto', overflowX: 'hidden', padding: '8px' }}>
      <Box sx={{ backgroundColor: '#444', borderRadius: '8px', padding: '8px', textAlign: 'center', mb: 1 }}>
        <Typography sx={{ color: consumoColor, fontSize: '1rem', fontWeight: 'bold' }}>{formattedConsumo}</Typography>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{consumoLabel}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ backgroundColor: '#444', borderRadius: '8px', padding: '8px', width: '48%', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 'bold' }}>4</Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Offline</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#444', borderRadius: '8px', padding: '8px', width: '48%', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 'bold' }}>365</Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Total</Typography>
        </Box>
      </Box>
      <List>
        {dispositivos.map((dispositivo) => {
          const consumo = dispositivo.consumo < 1000 ? `${dispositivo.consumo} W` : `${(dispositivo.consumo / 1000).toFixed(2)} kW`;
          return (
            <ListItem key={dispositivo.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.2, maxWidth: '100%', overflow: 'hidden' }}>
              <Typography sx={{ fontSize: '0.75rem', mr: 1, flexShrink: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{dispositivo.nombre}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#1976d2', flexShrink: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{consumo}</Typography>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

export default DeviceList;
EOL

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

# Crear el archivo src/styles/custom.css
cat <<EOF > src/styles/custom.css
.device-list {
  background-color: #333;
  border-radius: 8px; /* Vértices redondeados */
  color: white;
  width: 300px; /* Ancho fijo */
  max-width: 300px; /* Ancho máximo fijo */
  height: calc(100vh - 100px); /* Altura ajustable con la ventana */
  overflow-y: auto; /* Scroll vertical */
  overflow-x: hidden; /* Ocultar el scroll horizontal */
  padding: 8px;
  margin-left: auto; /* Alineado a la derecha */
  scrollbar-width: thin;
  scrollbar-color: #1976d2 #333;
}

.device-list-header {
  background-color: #444;
  border-radius: 8px;
  padding: 8px;
  text-align: center;
  margin-bottom: 8px; /* Menos separación */
}

.device-list-header .consumo-icon {
  color: inherit;
  font-size: 1rem;
}

.device-list-header .consumo-value {
  color: inherit;
  font-size: 1rem;
  font-weight: bold;
}

.device-list-header .consumo-text {
  font-size: 0.75rem;
  font-weight: bold;
}

.device-list-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px; /* Menos separación */
}

.device-list-stats .stat-box {
  background-color: #444;
  border-radius: 8px;
  padding: 8px;
  width: 48%;
  text-align: center;
}

.device-list-stats .stat-box .stat-value {
  font-size: 1rem;
  font-weight: bold;
}

.device-list-stats .stat-box .stat-text {
  font-size: 0.75rem;
  font-weight: bold;
}

.device-list-item {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
  max-width: 100%; /* Prevenir desbordamiento horizontal */
  overflow: hidden; /* Prevenir desbordamiento horizontal */
}

.device-list-item .device-name,
.device-list-item .device-consumption {
  font-size: 0.75rem;
  white-space: nowrap; /* Prevenir desbordamiento horizontal */
  text-overflow: ellipsis; /* Prevenir desbordamiento horizontal */
  overflow: hidden; /* Prevenir desbordamiento horizontal */
}

/* Estilos de la barra de desplazamiento */
.device-list::-webkit-scrollbar {
  width: 8px; /* Más fino */
}

.device-list::-webkit-scrollbar-thumb {
  background-color: #1976d2;
  border-radius: 4px;
}

.device-list::-webkit-scrollbar-horizontal {
  display: none; /* Ocultar el scroll horizontal */
}
EOF
