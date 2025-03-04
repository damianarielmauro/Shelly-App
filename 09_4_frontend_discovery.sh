#!/bin/bash

echo "*****************************************"
echo "*        09_4_frontend_discovery        *"
echo "*****************************************"



# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"


# Crear el archivo src/pages/Settings.tsx
cat <<EOL > src/pages/Settings.tsx
import React from 'react';
import Discovery from '../components/Discovery';
import UsersManagement from '../components/UsersManagement';
import { Tabs, Tab, Box } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const [selectedTab, setSelectedTab] = React.useState(0);
  const navigate = useNavigate();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleHomeClick = () => {
    navigate('/dashboard');
  };

  return (
    <Box sx={{ backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0 }}>
        <Tabs value={selectedTab} onChange={handleTabChange} aria-label="settings-tabs" sx={{ color: 'white', fontSize: '1.25rem' }}>
          <Tab label="Descubrimiento de Dispositivos" sx={{ color: 'white', fontWeight: selectedTab === 0 ? 'bold' : 'normal' }} />
          <Tab label="Gestión de Usuarios y Perfiles" sx={{ color: 'white', fontWeight: selectedTab === 1 ? 'bold' : 'normal' }} />
        </Tabs>
        <HomeIcon sx={{ color: 'white', cursor: 'pointer', marginRight: '16px' }} onClick={handleHomeClick} />
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: '#1976d2', width: '100%', flexShrink: 0 }} />
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {selectedTab === 0 && <Discovery />}
        {selectedTab === 1 && <UsersManagement />}
      </Box>
    </Box>
  );
};

export default Settings;
EOL

# Crear el archivo src/components/Discovery.tsx
cat <<EOL > src/components/Discovery.tsx
import React, { useState, useEffect, useRef } from 'react';
import { startDiscovery } from '../services/api';
import { createSSEConnection } from '../services/sse';
import { TextField, Button, Box, Typography, LinearProgress } from '@mui/material';
import { AnsiUp } from 'ansi_up';

const Discovery = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [subnets, setSubnets] = useState<string>('');
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [lastDiscoveryTime, setLastDiscoveryTime] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDiscovering) {
      const eventSource = createSSEConnection('https://172.16.10.222:8000/api/logs', (data) => {
        setLogs((prevLogs) => {
          if (data.includes("=== Fin de ejecución del script de descubrimiento ===")) {
            setIsDiscovering(false);
            setLastDiscoveryTime(new Date().toLocaleString());
            eventSource.close();
          }
          if (!prevLogs.includes(data)) {
            return [...prevLogs, data];
          }
          return prevLogs;
        });
      });

      return () => {
        eventSource.close();
      };
    }
  }, [isDiscovering]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleDiscovery = async () => {
    if (!subnets.trim()) {
      alert('Por favor, ingrese las subredes (ejemplo: 192.168.1.0/24, 10.1.100.0/24)');
      return;
    }
    setIsDiscovering(true);
    setLogs(['Iniciando descubrimiento...']);
    try {
      await startDiscovery(subnets.split(','));
    } catch (error) {
      setLogs((prevLogs) => [...prevLogs, 'Error al iniciar el descubrimiento']);
      setIsDiscovering(false);
    }
  };

  const ansiUp = new AnsiUp();

  return (
    <Box p={3} sx={{ backgroundColor: 'black', color: 'white', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0 }}>
        <Typography variant="body1" sx={{ color: 'white' }}>Descubrimiento de Dispositivos</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleDiscovery}
          disabled={isDiscovering}
          sx={{ backgroundColor: '#1976d2', height: '40px', marginLeft: '16px' }}
        >
          Iniciar Descubrimiento
        </Button>
      </Box>
      <TextField
        fullWidth
        label="Subredes"
        placeholder="Ingrese las subredes, ej: 192.168.1.0/24, 10.1.100.0/24"
        value={subnets}
        onChange={(e) => setSubnets(e.target.value)}
        margin="normal"
        sx={{ backgroundColor: '#333', borderRadius: '4px', height: '40px', color: 'white' }}
        InputLabelProps={{ style: { color: 'white' } }}
        InputProps={{ style: { color: 'white' } }}
      />
      {isDiscovering && <LinearProgress />}
      <Box mt={2} p={2} bgcolor="#333" borderRadius={4} overflow="auto" sx={{ flexGrow: 1 }}>
        <pre style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: ansiUp.ansi_to_html(logs.join('\n')) }} />
        <div ref={logsEndRef} />
      </Box>
      <Typography variant="body2" sx={{ color: 'white', mt: 2, flexShrink: 0 }}>
        Último descubrimiento: {lastDiscoveryTime || 'N/A'}
      </Typography>
    </Box>
  );
};

export default Discovery;
EOL

# Crear el archivo src/components/UsersManagement.tsx
cat <<EOL > src/components/UsersManagement.tsx
import React from 'react';

const UsersManagement = () => {
  return (
    <div>
      <h1>Gestión de Usuarios y Perfiles</h1>
      {/* Placeholder para la gestión de usuarios y perfiles */}
    </div>
  );
};

export default UsersManagement;
EOL

# Crear el archivo src/services/sse.ts
cat <<EOL > src/services/sse.ts
export const createSSEConnection = (url: string, onMessage: (data: any) => void) => {
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    onMessage(event.data);
  };

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    eventSource.close();
  };

  return eventSource;
};
EOL

# Crear el archivo config-overrides.js para configurar Webpack
cat <<EOL > config-overrides.js
const webpack = require('webpack');

module.exports = function override(config, env) {
  config.resolve.fallback = {
    crypto: require.resolve('crypto-browserify'),
    process: require.resolve('process/browser.js'),
    buffer: require.resolve('buffer/'),
  };
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
  );

  return config;
};
EOL

# Instalar react-app-rewired y ansi_up
CI=true npm install --loglevel=error --no-audit react-app-rewired ansi_up --save

# Reemplazar scripts en package.json
CI=true npx json -I -f package.json -e 'this.scripts.start="react-app-rewired start"'
CI=true npx json -I -f package.json -e 'this.scripts.build="react-app-rewired build"'
CI=true npx json -I -f package.json -e 'this.scripts.test="react-app-rewired test"'

# Reinstalar dependencias para evitar errores de módulos faltantes
echo "Reinstalando dependencias..."
rm -rf node_modules package-lock.json
CI=true npm install  --loglevel=error --no-audit


