#!/bin/bash

echo "*****************************************"
echo "*       09_5_frontend_rooms_devices     *"
echo "*****************************************"

# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"

# Crear el archivo src/components/RoomMatrix.tsx
cat <<'EOF' > src/components/RoomMatrix.tsx
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

const RoomMatrix = ({ habitaciones }: { habitaciones: any[] }) => {
  return (
    <Box>
      <Box display="flex" flexWrap="wrap">
        {habitaciones.map((habitacion) => {
          const consumo = habitacion.consumo < 1000 ? `${habitacion.consumo} W` : `${(habitacion.consumo / 1000).toFixed(2)} kW`;
          return (
            <Paper key={habitacion.id} sx={{ m: 1, p: 2, backgroundColor: '#333', color: 'white', width: '100px', height: '100px', textAlign: 'center', borderRadius: '8px' }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', mb: 0.5 }}>{habitacion.nombre}</Typography>
              <Typography variant="body1" sx={{ fontSize: '1rem', color: '#1976d2' }}>{consumo}</Typography>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

export default RoomMatrix;
EOF

# Crear el archivo src/components/DeviceList.tsx
cat <<'EOF' > src/components/DeviceList.tsx
import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { getDispositivos } from '../services/api';

const DeviceList = () => {
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [totalDispositivos, setTotalDispositivos] = useState(0);

  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        const data = await getDispositivos();
        setDispositivos(data);
        setTotalDispositivos(data.length);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    fetchDispositivos();
  }, []);

  const totalConsumo = -12800; // Ejemplo en W (-12.8 kW)
  const consumoColor = totalConsumo >= 0 ? '#1E8FFF' : '#00ff00'; // Verde más intenso y brillante
  const formattedConsumo = totalConsumo < 1000 && totalConsumo > -1000 ? `${totalConsumo} W` : `${(totalConsumo / 1000).toFixed(2)} kW`;
  const consumoLabel = totalConsumo >= 0 ? 'Consumo Total' : 'Generación Total';

  const getColorForConsumo = (consumo: number) => {
    return consumo >= 0 ? '#1E8FFF' : '#00ff00'; // Azul intenso para valores positivos, verde para negativos
  };

  return (
    <Box className="device-list" sx={{ backgroundColor: '#333', borderRadius: '8px', color: 'white', width: '100%', maxWidth: '300px', height: 'calc(100vh - 85px)', overflowY: 'auto', overflowX: 'hidden', padding: '8px', margin: '0 auto', boxSizing: 'border-box' }}>
      <Box sx={{ backgroundColor: '#444', borderRadius: '8px', padding: '8px', textAlign: 'center', mb: 1 }}>
        <BoltIcon sx={{ color: consumoColor }} />
        <Typography sx={{ color: consumoColor, fontSize: '1rem', fontWeight: 'bold' }}>{formattedConsumo}</Typography>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{consumoLabel}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ backgroundColor: '#444', borderRadius: '8px', padding: '8px', textAlign: 'center', width: '48%' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 'bold' }}>4</Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Offline</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#444', borderRadius: '8px', padding: '8px', textAlign: 'center', width: '48%' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 'bold' }}>{totalDispositivos}</Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Total</Typography>
        </Box>
      </Box>
      <List sx={{ padding: 0 }}>
        {dispositivos.map((dispositivo) => {
          const consumo = Math.floor(Math.random() * (3578 - 7 + 1)) + 7; // Valor aleatorio entre 7W y 3578W
          const formattedConsumo = consumo < 1000 ? `${consumo} W` : `${(consumo / 1000).toFixed(2)} kW`;
          const consumoColor = getColorForConsumo(consumo);
          return (
            <ListItem key={dispositivo.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.2, px: 0.5 }} className="device-list-item">
              <Typography sx={{ fontSize: '0.75rem', mr: 1, flexShrink: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '65%' }}>{dispositivo.nombre}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: consumoColor, flexShrink: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '35%' }}>{formattedConsumo}</Typography>
            </ListItem>
          );
        })}
      </List>
    </Box>
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
