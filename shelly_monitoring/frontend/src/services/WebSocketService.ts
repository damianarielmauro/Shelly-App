/**
 * WebSocketService.ts
 * 
 * Servicio para gestionar conexiones WebSocket con el backend.
 * Implementa reconexión automática y emisión de eventos.
 */

import { eventBus } from './EventBus';

class WebSocketService {
  private socket: WebSocket | null = null;
  private baseUrl: string | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectInterval: number = 5000; // 5 segundos entre intentos

  /**
   * Configura la URL base del WebSocket
   * @param url URL base para conexiones WebSocket
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Devuelve el estado actual de la conexión
   * @returns Boolean indicando si hay conexión activa
   */
  isConnectedNow(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Establece una conexión WebSocket con el backend
   * @returns Promise que se resuelve cuando la conexión está establecida
   */
  connect(): Promise<void> {
    // Si ya hay una conexión activa, no hacer nada
    if (this.isConnectedNow()) {
      console.log('WebSocketService: Ya conectado');
      return Promise.resolve();
    }

    // Si no hay URL base configurada, rechazar
    if (!this.baseUrl) {
      return Promise.reject(new Error('WebSocketService: URL base no configurada'));
    }

    // Limpiar cualquier timeout de reconexión pendiente
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        console.log(`WebSocketService: Conectando a ${this.baseUrl}`);
        
        // Crear nueva conexión WebSocket
        this.socket = new WebSocket(this.baseUrl as string);
        
        // Manejador de apertura de conexión
        this.socket.onopen = () => {
          console.log('WebSocketService: Conexión establecida');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Notificar cambio de estado de conexión
          eventBus.emit('connection:status-changed', 'connected');
          
          resolve();
        };
        
        // Manejador de errores
        this.socket.onerror = (error) => {
          console.error('WebSocketService: Error en conexión WebSocket', error);
          if (!this.isConnected) {
            reject(error);
          }
          
          // No cerramos la conexión aquí, dejamos que onclose la maneje
        };
        
        // Manejador de cierre de conexión
        this.socket.onclose = (event) => {
          if (this.isConnected) {
            console.log(`WebSocketService: Conexión cerrada (${event.code}): ${event.reason}`);
            this.isConnected = false;
            eventBus.emit('connection:status-changed', 'disconnected', { code: event.code, reason: event.reason });
            this.scheduleReconnect();
          }
        };
        
        // Manejador de mensajes
        this.socket.onmessage = this.handleMessage.bind(this);
        
      } catch (error) {
        console.error('WebSocketService: Error estableciendo conexión WebSocket', error);
        reject(error);
      }
    });
  }

  /**
   * Programa un intento de reconexión
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('WebSocketService: Máximo número de intentos de reconexión alcanzado');
      eventBus.emit('connection:status-changed', 'failed', { 
        attempts: this.reconnectAttempts 
      });
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
    console.log(`WebSocketService: Intentando reconexión en ${delay}ms (intento ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      console.log(`WebSocketService: Ejecutando intento de reconexión ${this.reconnectAttempts}`);
      this.connect().catch(() => {
        // Si falla, se manejará en el próximo ciclo
      });
    }, delay);
  }

  /**
   * Cierra la conexión WebSocket de forma controlada
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      console.log('WebSocketService: Cerrando conexión');
      this.socket.close(1000, 'Cierre controlado por la aplicación');
      this.socket = null;
      this.isConnected = false;
      eventBus.emit('connection:status-changed', 'disconnected', { 
        code: 1000, 
        reason: 'Cierre controlado' 
      });
    }
  }

  /**
   * Maneja los mensajes entrantes desde el WebSocket
   * @param event Evento de mensaje WebSocket
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      if (!data || !data.type) {
        console.warn('WebSocketService: Mensaje sin tipo recibido', data);
        return;
      }
      
      switch (data.type) {
        case 'device_state':
          if (data.deviceId !== undefined && data.state !== undefined) {
            console.log(`WebSocketService: Estado de dispositivo recibido: ${data.deviceId} -> ${data.state}`);
            eventBus.emit('device:state-update', data.deviceId, data.state, 'websocket', data);
          }
          break;
          
        case 'device_online':
          if (data.deviceId !== undefined && data.online !== undefined) {
            console.log(`WebSocketService: Estado online recibido: ${data.deviceId} -> ${data.online ? 'online' : 'offline'}`);
            eventBus.emit('device:online-update', data.deviceId, data.online);
          }
          break;
          
        case 'device_consumption':
          if (data.deviceId !== undefined && data.consumption !== undefined) {
            console.log(`WebSocketService: Consumo recibido: ${data.deviceId} -> ${data.consumption}`);
            eventBus.emit('device:consumption-update', data.deviceId, data.consumption);
          }
          break;
          
        case 'ping':
          this.sendMessage({ type: 'pong', timestamp: Date.now() });
          break;
          
        default:
          console.log(`WebSocketService: Mensaje recibido: ${data.type}`, data);
          // Emitir un evento genérico para que otros servicios puedan manejarlo
          eventBus.emit('websocket:message', data.type, data);
      }
    } catch (error) {
      console.error('WebSocketService: Error procesando mensaje', error, event.data);
    }
  }

  /**
   * Envía un mensaje por el WebSocket
   * @param data Objeto a enviar (será convertido a JSON)
   * @returns Promesa que se resuelve si el mensaje se envió correctamente
   */
  sendMessage(data: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.isConnectedNow()) {
        return reject(new Error('WebSocketService: No hay conexión activa'));
      }
      
      try {
        const message = JSON.stringify(data);
        this.socket?.send(message);
        resolve();
      } catch (error) {
        console.error('WebSocketService: Error enviando mensaje', error, data);
        reject(error);
      }
    });
  }

  /**
   * Solicita una actualización de estado de todos los dispositivos
   */
  async requestDevicesRefresh(): Promise<any> {
    try {
      await this.sendMessage({ type: 'request_all_devices' });
      
      // Simulamos respuesta temporal (en producción sería más complejo con una promise/timeout)
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, devices: [] });
        }, 100);
      });
    } catch (error) {
      console.error('WebSocketService: Error solicitando actualización de dispositivos', error);
      throw error;
    }
  }

  /**
   * Cambia el estado de un dispositivo
   * @param deviceId ID del dispositivo
   * @param newState Nuevo estado (0=apagado, 1=encendido)
   */
  async toggleDeviceState(deviceId: number, newState: number): Promise<void> {
    try {
      console.log(`WebSocketService: Enviando cambio de estado para dispositivo ${deviceId}: ${newState}`);
      
      await this.sendMessage({
        type: 'toggle_device',
        deviceId,
        state: newState
      });
      
      // Podríamos esperar confirmación del servidor aquí
      return Promise.resolve();
    } catch (error) {
      console.error(`WebSocketService: Error al cambiar estado del dispositivo ${deviceId}`, error);
      throw error;
    }
  }
}

// Singleton - toda la app usará la misma instancia
export const webSocketService = new WebSocketService();
