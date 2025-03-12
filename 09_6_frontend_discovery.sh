#!/bin/bash

echo "*****************************************"
echo "*        09_6_frontend_discovery        *"
echo "*****************************************"

# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"

# Crear el archivo src/pages/Settings.tsx
cat <<EOL > src/pages/Settings.tsx
import React from 'react';
import Discovery from '../components/Discovery';
import UsersManagement from '../pages/UsersManagement';
import { Tabs, Tab, Box } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';

interface SettingsProps {
  user: {
    permissions: string[];
  };
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
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
          <Tab label="Descubrir Dispositivos" sx={{ color: 'white', fontWeight: selectedTab === 0 ? 'bold' : 'normal' }} />
          <Tab label="Usuarios y Perfiles" sx={{ color: 'white', fontWeight: selectedTab === 1 ? 'bold' : 'normal' }} />
        </Tabs>
        <HomeIcon sx={{ color: 'white', cursor: 'pointer', marginRight: '18px' }} onClick={handleHomeClick} />
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: '#1976d2', width: '100%', flexShrink: 0 }} />
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {selectedTab === 0 && <Discovery user={user} />}
        {selectedTab === 1 && <UsersManagement user={user} />}
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
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { checkPermission } from '../services/auth';

interface DiscoveryProps {
  user: {
    permissions: string[];
  };
}

const Discovery: React.FC<DiscoveryProps> = ({ user }) => {
  const [subnets, setSubnets] = useState<string>('');
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [lastDiscoveryTime, setLastDiscoveryTime] = useState<string | null>(
    localStorage.getItem('lastDiscoveryTime')
  );
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminal.current = new Terminal({
        theme: {
          background: '#333',
          foreground: '#FFF', // Set the foreground color to ensure text is visible
        },
        convertEol: true,
      });
      fitAddon.current = new FitAddon();
      terminal.current.loadAddon(fitAddon.current);
      terminal.current.open(terminalRef.current);
      fitAddon.current.fit();
    }

    return () => {
      terminal.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (isDiscovering) {
      const eventSource = createSSEConnection('https://172.16.10.222:8000/api/logs', (data) => {
        terminal.current?.writeln(data);
        if (data.includes("=== Fin del descubrimiento ===")) {
          setIsDiscovering(false);
          const discoveryTime = new Date().toLocaleString();
          setLastDiscoveryTime(discoveryTime);
          localStorage.setItem('lastDiscoveryTime', discoveryTime);
          eventSource.close();
        }
      });

      return () => {
        eventSource.close();
      };
    }
  }, [isDiscovering]);

  const handleDiscovery = async () => {
    if (!checkPermission(user, 'start_discovery')) {
      alert('No tienes permiso para iniciar el descubrimiento.');
      return;
    }
    if (!subnets.trim()) {
      alert('Por favor, ingrese las subredes (ejemplo: 192.168.1.0/24, 10.1.100.0/24)');
      return;
    }
    setIsDiscovering(true);
    terminal.current?.clear();
    terminal.current?.writeln('Iniciando descubrimiento...');
    try {
      await startDiscovery(subnets.split(','));
    } catch (error) {
      terminal.current?.writeln('Error al iniciar el descubrimiento');
      setIsDiscovering(false);
    }
  };

  return (
    <Box p={3} sx={{ backgroundColor: 'black', color: 'white', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Ingrese las subredes, ej: 192.168.1.0/24, 10.1.100.0/24"
          value={subnets}
          onChange={(e) => setSubnets(e.target.value)}
          margin="normal"
          sx={{
            backgroundColor: '#333',
            borderRadius: '4px',
            color: 'white',
            flexGrow: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: 'none' },
              '&:hover fieldset': { borderColor: 'none' },
              '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#1976d2' },
            },
            '& input': {
              color: 'white',
              padding: '10px 12px',
              height: '40px', // Asegura que el cuadro de texto tenga una altura consistente
              boxSizing: 'border-box',
            },
            '& .MuiInputBase-input::placeholder': {
              color: 'rgba(255, 255, 255, 0.7)',
            }
          }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleDiscovery}
          disabled={isDiscovering}
          sx={{
            backgroundColor: '#1976d2',
            fontSize: '10px',
            height: '40px',  // Asegura que el botón tenga la misma altura que el campo de texto
            marginLeft: '18px',
            lineHeight: '1.5',  // Asegura que el contenido del botón esté centrado verticalmente
            padding: '0 16px',  // Ajusta el padding para que coincida con el del cuadro de texto
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',  // Centra el contenido del botón verticalmente
          }}
        >
          Iniciar
        </Button>
      </Box>
      {isDiscovering && <LinearProgress />}
      <Box mt={2} p={2} bgcolor="#333" borderRadius={4} overflow="auto" sx={{ flexGrow: 1, scrollbarWidth: 'thin', scrollbarColor: '#1976d2 #333' }}>
        <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />
      </Box>
      <Typography variant="body2" sx={{ color: 'white', mt: 2, flexShrink: 0 }}>
        Último descubrimiento: {lastDiscoveryTime || 'N/A'}
      </Typography>
    </Box>
  );
};

export default Discovery;
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

# Crear el archivo src/pages/UsersManagement.tsx
cat <<EOL > src/pages/UsersManagement.tsx
import React, { useState } from 'react';
import { createUser } from '../services/api';
import { checkPermission } from '../services/auth';

interface UsersManagementProps {
  user: {
    permissions: string[];
  };
}

const UsersManagement: React.FC<UsersManagementProps> = ({ user }) => {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const handleCreateUser = async () => {
    if (!checkPermission(user, 'create_user')) {
      alert('No tienes permiso para crear usuarios.');
      return;
    }
    if (username && email && password && role) {
      try {
        await createUser(username, email, password, role);
        setMessage('Usuario creado correctamente');
        setUsername('');
        setEmail('');
        setPassword('');
        setRole('');
      } catch (error) {
        setMessage('Error al crear el usuario');
      }
    } else {
      setMessage('Por favor, completa todos los campos');
    }
  };

  return (
    <div>
      <h2>Gestión de Usuarios</h2>
      <input
        type="text"
        placeholder="Nombre de usuario"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="text"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="text"
        placeholder="Rol"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      <button onClick={handleCreateUser}>Crear Usuario</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default UsersManagement;
EOL
