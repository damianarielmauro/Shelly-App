import React, { useState, useEffect, useRef } from 'react';
import { startDiscovery } from '../services/api';
import { discoverShellyDevices, syncShellyDevices } from '../services/shellyService';
import { createSSEConnection } from '../services/sse';
import { TextField, Button, Box, Typography, LinearProgress, FormControlLabel, Radio, RadioGroup, Divider } from '@mui/material';
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
  const [discoveryMethod, setDiscoveryMethod] = useState<string>('level3');
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
      const eventSource = createSSEConnection('/api/logs', (data) => {  
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

  const handleDiscoveryMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDiscoveryMethod(event.target.value);
  };

  const handleDiscovery = async () => {
    if (!checkPermission(user, 'start_discovery')) {
      alert('No tienes permiso para iniciar el descubrimiento.');
      return;
    }

    setIsDiscovering(true);
    terminal.current?.clear();
    
    try {
      if (discoveryMethod === 'level3') {
        // Método de descubrimiento nivel 3 (existente)
        if (!subnets.trim()) {
          alert('Por favor, ingrese las subredes (ejemplo: 192.168.1.0/24, 10.1.100.0/24)');
          setIsDiscovering(false);
          return;
        }
        
        terminal.current?.writeln('Iniciando descubrimiento nivel 3 (a través de routers)...');
        await startDiscovery(subnets.split(','));
      } else if (discoveryMethod === 'shelly') {
        // Método de descubrimiento mediante Shelly.ioAdapter
        terminal.current?.writeln('Iniciando descubrimiento mediante Shelly.ioAdapter (mDNS en subred local)...');
        await discoverShellyDevices();
        
        terminal.current?.writeln('Esperando descubrimiento de dispositivos...');
        terminal.current?.writeln('Este proceso puede tardar hasta 60 segundos...');
        
        // Simulamos espera de 10 segundos antes de sincronizar con la base de datos
        setTimeout(async () => {
          terminal.current?.writeln('Sincronizando dispositivos descubiertos con la base de datos...');
          try {
            const result = await syncShellyDevices();
            terminal.current?.writeln(result.message);
            terminal.current?.writeln("=== Fin del descubrimiento ===");
          } catch (error) {
            terminal.current?.writeln('Error al sincronizar dispositivos: ' + String(error));
            terminal.current?.writeln("=== Fin del descubrimiento ===");
          }
        }, 10000);
      }
    } catch (error) {
      terminal.current?.writeln('Error al iniciar el descubrimiento: ' + String(error));
      setIsDiscovering(false);
    }
  };

  return (
    <Box p={3} sx={{ backgroundColor: 'black', color: 'white', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Método de descubrimiento:</Typography>
        <RadioGroup
          row
          value={discoveryMethod}
          onChange={handleDiscoveryMethodChange}
        >
          <FormControlLabel 
            value="level3" 
            control={<Radio sx={{ color: 'white', '&.Mui-checked': { color: '#2391FF' } }} />} 
            label="Nivel 3 (a través de routers)" 
          />
          <FormControlLabel 
            value="shelly" 
            control={<Radio sx={{ color: 'white', '&.Mui-checked': { color: '#2391FF' } }} />} 
            label="Shelly.ioAdapter (mDNS local)" 
          />
        </RadioGroup>
      </Box>
      
      <Divider sx={{ backgroundColor: '#2391FF', mb: 2 }} />
      
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0, mb: 2 }}>
        {discoveryMethod === 'level3' && (
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
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#2391FF' },
              },
              '& input': {
                color: 'white',
                padding: '10px 12px',
                height: '40px',
                boxSizing: 'border-box',
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255, 255, 255, 0.7)',
              }
            }}
          />
        )}
        {discoveryMethod === 'shelly' && (
          <Typography variant="body1" sx={{ flexGrow: 1, color: '#aaa' }}>
            El descubrimiento mDNS buscará dispositivos Shelly en la red local sin necesidad de especificar subredes.
          </Typography>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleDiscovery}
          disabled={isDiscovering}
          sx={{
            backgroundColor: '#2391FF',
            fontSize: '10px',
            height: '40px',
            marginLeft: '18px',
            lineHeight: '1.5',
            padding: '0 16px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Iniciar
        </Button>
      </Box>
      {isDiscovering && <LinearProgress />}
      <Box mt={2} p={2} bgcolor="#333" borderRadius={4} overflow="auto" sx={{ flexGrow: 1, scrollbarWidth: 'thin', scrollbarColor: '#2391FF #333' }}>
        <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />
      </Box>
      <Typography variant="body2" sx={{ color: 'white', mt: 2, flexShrink: 0 }}>
        Último descubrimiento: {lastDiscoveryTime || 'N/A'}
      </Typography>
    </Box>
  );
};

export default Discovery;
