const express = require('express');
const axios = require('axios');
const mqtt = require('mqtt');
const coap = require('coap');
const mdns = require('mdns');

const app = express();
const port = 8087;

// Lista para almacenar dispositivos
let devices = [];

app.use(express.json());

// Ruta para obtener todos los dispositivos
app.get('/api/v1/devices', (req, res) => {
  res.json(devices);
});

// Ruta para iniciar descubrimiento
app.post('/api/v1/discover', (req, res) => {
  console.log('Iniciando descubrimiento de dispositivos Shelly...');
  
  // Simular el descubrimiento - en una implementación real esto usaría mDNS
  setTimeout(() => {
    // Agregar algunos dispositivos de ejemplo
    devices = [
      {
        id: 'shelly-1',
        ip: '192.168.1.100',
        type: 'Shelly1',
        name: 'Luz Cocina',
        online: true,
        fw_version: '1.9.5',
        update_available: false,
        mac: 'AC:23:3F:A3:8D:1C'
      },
      {
        id: 'shelly-2',
        ip: '192.168.1.101',
        type: 'ShellyPlug',
        name: 'Enchufe Sala',
        online: true,
        fw_version: '1.8.3',
        update_available: true,
        mac: 'AC:23:3F:A3:8D:1D',
        meters: [
          {
            power: 45.8,
            is_valid: true
          }
        ]
      }
    ];
    
    console.log('Descubrimiento completado, encontrados ' + devices.length + ' dispositivos');
  }, 2000);
  
  res.json({ status: 'ok', message: 'Descubrimiento iniciado' });
});

// Ruta para obtener información de un dispositivo
app.get('/api/v1/devices/:id', (req, res) => {
  const device = devices.find(d => d.id === req.params.id);
  if (device) {
    res.json(device);
  } else {
    res.status(404).json({ status: 'error', message: 'Dispositivo no encontrado' });
  }
});

// Ruta para obtener estado de un dispositivo
app.get('/api/v1/devices/:id/status', (req, res) => {
  const device = devices.find(d => d.id === req.params.id);
  if (device) {
    res.json({ online: device.online, meters: device.meters || [] });
  } else {
    res.status(404).json({ status: 'error', message: 'Dispositivo no encontrado' });
  }
});

// Ruta para controlar un dispositivo
app.post('/api/v1/devices/:id/relay/:channel', (req, res) => {
  const device = devices.find(d => d.id === req.params.id);
  if (device) {
    const turn = req.body.turn || 'off';
    console.log(`Cambiando estado del dispositivo ${req.params.id} a ${turn}`);
    
    // En una implementación real, aquí se enviaría un comando al dispositivo
    device.online = turn === 'on';
    
    res.json({ status: 'ok', message: `Dispositivo cambiado a ${turn}` });
  } else {
    res.status(404).json({ status: 'error', message: 'Dispositivo no encontrado' });
  }
});

// Ruta para verificar actualizaciones de firmware
app.get('/api/v1/devices/:id/firmware', (req, res) => {
  const device = devices.find(d => d.id === req.params.id);
  if (device) {
    res.json({ 
      has_update: device.update_available || false,
      current_version: device.fw_version,
      new_version: device.update_available ? '2.0.0' : device.fw_version
    });
  } else {
    res.status(404).json({ status: 'error', message: 'Dispositivo no encontrado' });
  }
});

// Ruta para actualizar firmware
app.post('/api/v1/devices/:id/firmware/update', (req, res) => {
  const device = devices.find(d => d.id === req.params.id);
  if (device) {
    console.log(`Iniciando actualización de firmware para dispositivo ${req.params.id}`);
    
    // En una implementación real, aquí se enviaría un comando para actualizar
    device.update_available = false;
    device.fw_version = '2.0.0';
    
    res.json({ status: 'ok', message: 'Actualización iniciada' });
  } else {
    res.status(404).json({ status: 'error', message: 'Dispositivo no encontrado' });
  }
});

// Iniciar el servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Adaptador Shelly escuchando en http://0.0.0.0:${port}`);
});
