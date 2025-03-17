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
          if (eventSource) {
            eventSource.close();
          }
        }
      });

      return () => {
        if (eventSource) {
          eventSource.close();
        }
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
