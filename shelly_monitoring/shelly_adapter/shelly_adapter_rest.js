const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt-connection');
const net = require('net');
const Shelly = require('shelly-iot');
const EventEmitter = require('events');

class ShellyAdapter extends EventEmitter {
    constructor() {
        super();
        this.devices = new Map();
        this.initializeServers();
        this.setupExpress();
    }

    initializeServers() {
        // Inicializar servidor MQTT
        this.mqttServer = net.createServer((socket) => {
            const client = mqtt(socket);
            
            client.on('connect', (packet) => {
                console.log('Intento de conexión MQTT:', {
                    clientId: packet.clientId,
                    username: packet.username,
                    protocol: packet.protocolId,
                    version: packet.protocolVersion,
                    keepalive: packet.keepalive,
                    password: packet.password ? '***' : 'no password'
                });

                // Verificar credenciales
                if (packet.username === 'admin' && packet.password.toString() === 'shelly') {
                    console.log('Cliente MQTT autenticado exitosamente:', packet.clientId);
                    client.connack({
                        returnCode: 0,
                        sessionPresent: false
                    });
                } else {
                    console.log('Error de autenticación MQTT:', {
                        clientId: packet.clientId,
                        username: packet.username,
                        expectedUsername: 'admin',
                        receivedPassword: packet.password ? '***' : 'no password'
                    });
                    client.connack({returnCode: 5}); // No autorizado
                }
            });

            client.on('publish', (packet) => {
                console.log('Mensaje MQTT recibido:', {
                    topic: packet.topic,
                    payload: packet.payload.toString()
                });
                this.handleMqttMessage(packet);
            });

            client.on('subscribe', (packet) => {
                console.log('Suscripción MQTT:', {
                    messageId: packet.messageId,
                    subscriptions: packet.subscriptions
                });
                client.suback({
                    messageId: packet.messageId,
                    granted: packet.subscriptions.map(sub => sub.qos)
                });
            });

            client.on('error', (error) => {
                console.error('Error en cliente MQTT:', error);
            });

            client.on('close', () => {
                console.log('Cliente MQTT desconectado');
            });

            this.handleMqttClient(client);
        });

        this.mqttServer.listen(1883, '0.0.0.0', () => {
            console.log('Servidor MQTT escuchando en puerto 1883');
        });

        // Inicializar servidor CoAP
        this.coapServer = new Shelly({
            user: 'admin',
            password: 'admin',
            port: 5683,
            host: '0.0.0.0'
        });

        this.coapServer.on('update-device-status', (deviceId, status) => {
            console.log('Dispositivo actualizado:', deviceId, status);
            this.handleCoapMessage({ deviceId, ...status });
        });

        this.coapServer.on('device-connection-status', (deviceId, connected) => {
            console.log('Estado de conexión del dispositivo:', deviceId, connected);
            const device = this.devices.get(deviceId);
            if (device) {
                device.online = connected;
                this.emit('deviceUpdate', device);
            }
        });

        // Crear cliente MQTT para enviar comandos
        this.mqttClient = mqtt(net.connect(1883, 'localhost'));
        this.mqttClient.on('error', (error) => {
            console.error('Error en cliente MQTT:', error);
        });

        // Iniciar el servidor CoAP
        this.coapServer.listen(() => {
            console.log('Servidor CoAP escuchando en puerto 5683');
        });
    }

    setupExpress() {
        this.app = express();
        this.port = 8087;
        
        // Configurar middleware
        this.app.use(cors());
        this.app.use(express.json());
        
        this.setupRoutes();
    }

    setupRoutes() {
        // Rutas de la API REST
        this.app.get('/api/v1/devices', (req, res) => {
            const devices = Array.from(this.devices.values());
            console.log('Dispositivos disponibles:', devices);
            res.json(devices);
        });

        this.app.post('/api/v1/discover', async (req, res) => {
            try {
                await this.startDiscovery();
                res.json({ status: 'ok', message: 'Descubrimiento iniciado' });
            } catch (error) {
                res.status(500).json({ status: 'error', message: error.message });
            }
        });

        this.app.get('/api/v1/devices/:id', (req, res) => {
            const device = this.devices.get(req.params.id);
            if (device) {
                res.json(device);
            } else {
                res.status(404).json({ status: 'error', message: 'Dispositivo no encontrado' });
            }
        });

        this.app.get('/api/v1/devices/:id/status', (req, res) => {
            const device = this.devices.get(req.params.id);
            if (device) {
                res.json({
                    online: device.online,
                    meters: device.meters || [],
                    state: device.state
                });
            } else {
                res.status(404).json({ status: 'error', message: 'Dispositivo no encontrado' });
            }
        });

        this.app.post('/api/v1/devices/:id/relay/:channel', async (req, res) => {
            try {
                const device = this.devices.get(req.params.id);
                if (!device) {
                    return res.status(404).json({ status: 'error', message: 'Dispositivo no encontrado' });
                }

                const turn = req.body.turn || 'off';
                await this.controlDevice(device, parseInt(req.params.channel), turn === 'on');
                res.json({ status: 'ok', message: `Dispositivo cambiado a ${turn}` });
            } catch (error) {
                res.status(500).json({ status: 'error', message: error.message });
            }
        });

        this.app.get('/api/v1/devices/:id/firmware', async (req, res) => {
            try {
                const device = this.devices.get(req.params.id);
                if (!device) {
                    return res.status(404).json({ status: 'error', message: 'Dispositivo no encontrado' });
                }

                const firmwareInfo = await this.checkFirmwareUpdates(device);
                res.json(firmwareInfo);
            } catch (error) {
                res.status(500).json({ status: 'error', message: error.message });
            }
        });

        this.app.post('/api/v1/devices/:id/firmware/update', async (req, res) => {
            try {
                const device = this.devices.get(req.params.id);
                if (!device) {
                    return res.status(404).json({ status: 'error', message: 'Dispositivo no encontrado' });
                }

                await this.updateFirmware(device);
                res.json({ status: 'ok', message: 'Actualización iniciada' });
            } catch (error) {
                res.status(500).json({ status: 'error', message: error.message });
            }
        });
    }

    async startDiscovery() {
        try {
            // Suscribirse a temas MQTT
            const client = mqtt(net.connect(1883, 'localhost'));
            
            // Esperar a que el cliente se conecte
            await new Promise((resolve, reject) => {
                client.on('connect', () => {
                    console.log('Cliente MQTT conectado');
                    resolve();
                });
                
                client.on('error', (error) => {
                    console.error('Error en cliente MQTT:', error);
                    reject(error);
                });
            });
            
            // Configurar suscripciones MQTT
            const topics = [
                { topic: 'shellies/+/announce', qos: 1 },
                { topic: 'shellies/+/online', qos: 1 },
                { topic: 'shellies/+/info', qos: 1 },
                { topic: 'shellies/+/status', qos: 1 }
            ];
            
            // Suscribirse a cada tema
            topics.forEach(topic => {
                client.subscribe(topic);
            });
            
            console.log('Descubrimiento iniciado');
        } catch (error) {
            console.error('Error iniciando descubrimiento:', error);
            throw error;
        }
    }

    handleMqttClient(client) {
        client.on('connect', () => {
            console.log('Cliente MQTT conectado');
        });
    }

    handleMqttMessage(packet) {
        try {
            const topic = packet.topic;
            const payload = JSON.parse(packet.payload.toString());

            // Procesar anuncios de dispositivos
            if (topic.match(/shellies\/.+\/announce/)) {
                const deviceId = topic.split('/')[1];
                this.devices.set(deviceId, {
                    id: deviceId,
                    type: payload.type,
                    name: payload.name || deviceId,
                    online: true,
                    ...payload
                });
                this.emit('deviceUpdate', this.devices.get(deviceId));
            }

            // Procesar actualizaciones de estado
            if (topic.match(/shellies\/.+\/status/)) {
                const deviceId = topic.split('/')[1];
                const device = this.devices.get(deviceId);
                if (device) {
                    this.updateDeviceStatus({
                        deviceId,
                        ...payload
                    });
                }
            }

            // Procesar información del dispositivo
            if (topic.match(/shellies\/.+\/info/)) {
                const deviceId = topic.split('/')[1];
                const device = this.devices.get(deviceId);
                if (device) {
                    Object.assign(device, payload);
                    this.emit('deviceUpdate', device);
                }
            }

            // Procesar estado online/offline
            if (topic.match(/shellies\/.+\/online/)) {
                const deviceId = topic.split('/')[1];
                const device = this.devices.get(deviceId);
                if (device) {
                    device.online = payload.online;
                    this.emit('deviceUpdate', device);
                }
            }
        } catch (error) {
            console.error('Error procesando mensaje MQTT:', error);
        }
    }

    handleCoapMessage(message) {
        try {
            const { deviceId, ...data } = message;
            this.updateDeviceStatus({ deviceId, ...data });
        } catch (error) {
            console.error('Error procesando mensaje CoAP:', error);
        }
    }

    updateDeviceStatus(data) {
        const { deviceId, ...status } = data;
        const device = this.devices.get(deviceId);
        
        if (device) {
            Object.assign(device, status);
            this.emit('deviceUpdate', device);
        } else {
            this.devices.set(deviceId, {
                id: deviceId,
                online: true,
                ...status
            });
            this.emit('deviceUpdate', this.devices.get(deviceId));
        }
    }

    async controlDevice(device, channel, state) {
        try {
            const topic = `shellies/${device.id}/command`;
            const payload = {
                id: 1,
                src: 'iobroker',
                method: 'Switch.Set',
                params: {
                    id: channel,
                    on: state
                }
            };

            this.mqttClient.publish({
                topic,
                payload: JSON.stringify(payload),
                qos: 1
            });
        } catch (error) {
            console.error('Error controlando dispositivo:', error);
            throw error;
        }
    }

    async checkFirmwareUpdates(device) {
        // Implementación pendiente
        return { current: '1.0.0', latest: '1.0.0', update: false };
    }

    async updateFirmware(device) {
        // Implementación pendiente
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`Servidor REST escuchando en puerto ${this.port}`);
        });
    }
}

const adapter = new ShellyAdapter();
adapter.start(); 
