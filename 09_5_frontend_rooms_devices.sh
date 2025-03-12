#!/bin/bash

echo "*****************************************"
echo "*        09_5_frontend_room_devices     *"
echo "*****************************************"

# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"

# Crear el archivo src/components/RoomMatrix.tsx
cat <<'EOF' > src/components/RoomMatrix.tsx
import React from 'react';
import { Box, Card, CardContent, Typography, Checkbox } from '@mui/material';
import { checkPermission } from '../services/auth';

interface Habitacion {
  id: number;
  nombre: string;
  consumo: number;
}

interface RoomMatrixProps {
  user: {
    permissions: string[];
  };
  habitaciones: Habitacion[];
  deleteMode: boolean;
  selectedItems: number[];
  handleDeleteSelectionChange: (id: number) => void;
}

const RoomMatrix: React.FC<RoomMatrixProps> = ({ user, habitaciones, deleteMode, selectedItems, handleDeleteSelectionChange }) => {
  return (
    <Box display="flex" flexWrap="wrap">
      {habitaciones.map((habitacion) => (
        <Card key={habitacion.id} sx={{ width: 200, margin: 1, backgroundColor: '#333', color: 'white', position: 'relative' }}>
          <CardContent>
            <Typography variant="h6" component="div">
              {habitacion.nombre}
            </Typography>
            <Typography variant="body2">
              Consumo: {habitacion.consumo} kWh
            </Typography>
            {deleteMode && checkPermission(user, 'delete_habitacion') && (
              <Checkbox
                checked={selectedItems.includes(habitacion.id)}
                onChange={() => handleDeleteSelectionChange(habitacion.id)}
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  color: 'red',
                  '& .MuiSvgIcon-root': {
                    color: selectedItems.includes(habitacion.id) ? 'red' : 'white',
                  },
                  '&.Mui-checked': {
                    backgroundColor: 'none',
                  },
                }}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default RoomMatrix;
EOF

# Crear el archivo src/components/DeviceList.tsx
cat <<'EOF' > src/components/DeviceList.tsx
import React, { useState, useEffect } from 'react';
import { getDispositivos, toggleDevice } from '../services/api';
import { List, ListItem, ListItemText, Button, ListItemSecondaryAction } from '@mui/material';
import { checkPermission } from '../services/auth';

interface DeviceListProps {
  user: {
    permissions: string[];
  };
}

const DeviceList: React.FC<DeviceListProps> = ({ user }) => {
  const [dispositivos, setDispositivos] = useState<any[]>([]);

  useEffect(() => {
    const fetchDispositivos = async () => {
      const data = await getDispositivos();
      setDispositivos(data);
    };

    fetchDispositivos();
  }, []);

  const handleToggle = async (deviceId: number) => {
    if (!checkPermission(user, 'toggle_device')) {
      alert('No tienes permiso para cambiar el estado de los dispositivos.');
      return;
    }
    await toggleDevice(deviceId);
    const data = await getDispositivos();
    setDispositivos(data);
  };

  return (
    <List sx={{ backgroundColor: '#333', color: 'white' }}>
      {dispositivos.map((dispositivo) => (
        <ListItem key={dispositivo.id} sx={{ borderBottom: '1px solid #444' }}>
          <ListItemText primary={dispositivo.nombre} secondary={`Estado: ${dispositivo.estado ? 'Encendido' : 'Apagado'}`} />
          <ListItemSecondaryAction>
            <Button
              variant="contained"
              color={dispositivo.estado ? 'secondary' : 'primary'}
              onClick={() => handleToggle(dispositivo.id)}
            >
              {dispositivo.estado ? 'Apagar' : 'Encender'}
            </Button>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
};

export default DeviceList;
EOF

# Crear el archivo src/styles/custom.css
cat <<EOF > src/styles/custom.css
.device-list {
  background-color: #333;
  border-radius: 8px; /* Vértices redondeados */
  color: white;
  width: 100%; /* Ancho 100% */
  max-width: 300px; /* Ancho máximo 300px */
  height: calc(100vh - 100px); /* Altura ajustable con la ventana */
  overflow-y: auto; /* Scroll vertical */
  overflow-x: hidden; /* Ocultar el scroll horizontal */
  padding: 8px;
  margin: 0 auto; /* Centrado horizontal */
  box-sizing: border-box; /* Incluir padding y border en el ancho y alto */
  scrollbar-width: thin; /* Scrollbar más fino */
  scrollbar-color: #1976d2 #000; /* Color del thumb y el fondo de la barra de desplazamiento */
}

.device-list-header {
  background-color: #444;
  border-radius: 8px;
  padding: 8px;
  text-align: center;
  margin-bottom: 8px; /* Menos separación */
  box-sizing: border-box; /* Incluir padding y border en el ancho y alto */
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
  box-sizing: border-box; /* Incluir padding y border en el ancho y alto */
}

.device-list-stats .stat-box {
  background-color: #444;
  border-radius: 8px;
  padding: 8px;
  text-align: center;
  width: 48%;
  box-sizing: border-box; /* Incluir padding y border en el ancho y alto */
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
  padding: 0px 0;
  width: 100%; /* Ancho del 100% */
  overflow: hidden; /* Prevenir desbordamiento horizontal */
  box-sizing: border-box; /* Incluir padding y border en el ancho y alto */
}

.device-list-item .device-name,
.device-list-item .device-consumption {
  font-size: 0.75rem;
  white-space: nowrap; /* Prevenir desbordamiento horizontal */
  text-overflow: ellipsis; /* Prevenir desbordamiento horizontal */
  overflow: hidden; /* Prevenir desbordamiento horizontal */
  max-width: 65%; /* Ancho máximo del 65% */
}

/* Estilos de la barra de desplazamiento vertical */
.device-list::-webkit-scrollbar {
  width: 1px; /* Lo más fino posible */
}

.device-list::-webkit-scrollbar-thumb {
  background-color: #1976d2; /* Color del thumb de la barra */
  border-radius: 4px;
}

.device-list::-webkit-scrollbar-track {
  background-color: #000; /* Color del fondo de la barra */
}
EOF
