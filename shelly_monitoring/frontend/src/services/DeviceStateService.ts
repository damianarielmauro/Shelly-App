/**
 * DeviceStateService.ts
 * 
 * Implementación del "Gestor Central de Estado" para dispositivos en el frontend.
 * Mantiene caché local y coordina cambios entre WebSocket y UI.
 */

import { eventBus } from './EventBus';
import { webSocketService } from './WebSocketService';
import { 
  toggleDevice as apiToggleDevice, 
  getAllDevices, 
  getDispositivosByHabitacion 
} from './api';

// Tipo para el dispositivo con todas sus propiedades
export interface Dispositivo {
  id: number;
  nombre: string;
  tipo: string;
  ip: string;
  estado: number;
  habitacion_id?: number;
  habitacion_nombre?: string;
  consumo?: number;
  online: boolean;
  firmware_version?: string;
  ultima_actualizacion?: string;
  metadata?: any;
}

class DeviceStateManager {
  private deviceCache: { [key: number]: Dispositivo } = {};
  private isInitialized = false;
  private fallbackToRest = true;
  private pollingInterval: NodeJS.Timeout | null = null;
  
  // Agregar un registro de operaciones en curso
  private pendingOperations: {[deviceId: number]: boolean} = {};
  
  /**
   * Inicializa el sistema de eventos
   */
  initializeEventSystem(pollingMs: number = 30000): () => void {
    console.log(`DeviceStateService: Inicializando sistema de eventos con intervalo de ${pollingMs}ms`);
    
    this.loadInitialDevices().catch(err => {
      console.error('Error cargando dispositivos iniciales:', err);
    });
    
    // Iniciar polling para actualizaciones periódicas
    if (pollingMs > 0) {
      this.startPolling(pollingMs);
    }
    
    // Suscribirse a eventos de WebSocket
    eventBus.on('websocket:message', (type, data) => {
      if (type === 'device_update' && data.devices) {
        this.updateDevicesCache(data.devices);
      }
    });
    
    // Devolver función de limpieza
    return () => {
      console.log('DeviceStateService: Limpieza del sistema de eventos');
      this.stopPolling();
    };
  }
  
  /**
   * Inicia polling como respaldo para actualizaciones
   * @param intervalMs Intervalo en milisegundos
   */
  private startPolling(intervalMs: number): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    console.log(`DeviceStateService: Configurando polling cada ${intervalMs}ms`);
    
    this.pollingInterval = setInterval(() => {
      this.refreshDevicesViaAPI().catch(err => {
        console.warn('Error durante polling de dispositivos:', err);
      });
    }, intervalMs);
  }
  
  /**
   * Detiene el polling de respaldo
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  /**
   * Carga inicial de dispositivos
   */
  async loadInitialDevices(): Promise<Dispositivo[]> {
    try {
      console.log('DeviceStateService: Cargando datos iniciales de dispositivos');
      
      // Emitir evento de carga iniciada
      eventBus.emit('devices:loading');
      
      // Intentar cargar dispositivos
      const devices = await this.refreshDevicesViaAPI();
      
      return devices;
    } catch (error) {
      console.error('DeviceStateService: Error cargando dispositivos iniciales', error);
      eventBus.emit('devices:error', error);
      throw error;
    }
  }
  
  /**
   * Actualiza dispositivos usando API REST
   */
  private async refreshDevicesViaAPI(): Promise<Dispositivo[]> {
    try {
      const devices = await getAllDevices();
      
      if (Array.isArray(devices)) {
        this.updateDevicesCache(devices);
        eventBus.emit('devices:loaded', this.getAllDevices());
        return this.getAllDevices();
      } else {
        console.warn('DeviceStateService: Formato de respuesta API inválido');
        return [];
      }
    } catch (error) {
      console.error('DeviceStateService: Error obteniendo dispositivos por API REST', error);
      eventBus.emit('devices:error', error);
      throw error;
    }
  }
  
  /**
   * Actualiza la caché interna con los dispositivos recibidos
   */
  updateDevicesCache(devices: Partial<Dispositivo>[]): void {
    if (!Array.isArray(devices)) {
      console.error('DeviceStateService: Intento de actualizar caché con datos no válidos:', devices);
      return;
    }
    
    console.log(`DeviceStateService: Actualizando caché con ${devices.length} dispositivos`);
    
    devices.forEach(device => {
      if (device.id === undefined) return;
      
      if (this.deviceCache[device.id]) {
        // Si es una operación pendiente, no actualizar el estado
        if (this.pendingOperations[device.id] && device.estado !== undefined) {
          const cachedDevice = { ...this.deviceCache[device.id] };
          device.estado = cachedDevice.estado;
        }
        
        this.deviceCache[device.id] = {
          ...this.deviceCache[device.id],
          ...device
        };
      } else {
        this.deviceCache[device.id] = {
          ...device,
          online: device.online ?? true,
          estado: device.estado ?? 0
        } as Dispositivo;
      }
    });
    
    this.isInitialized = true;
  }
  
  /**
   * Obtiene todos los dispositivos de la caché
   */
  getAllDevices(): Dispositivo[] {
    return Object.values(this.deviceCache);
  }
  
  /**
   * Obtiene un dispositivo específico por ID
   */
  getDeviceById(id: number): Dispositivo | null {
    return this.deviceCache[id] || null;
  }
  
  /**
   * Obtiene dispositivos filtrados por habitación
   */
  async getDevicesByRoom(roomId: number): Promise<Dispositivo[]> {
    // Si tenemos datos en caché, usarlos
    const cachedDevices = this.getAllDevices().filter(device => device.habitacion_id === roomId);
    
    // Si hay datos en caché, devolverlos inmediatamente
    if (cachedDevices.length > 0 || this.isInitialized) {
      return cachedDevices;
    }
    
    try {
      // No hay datos en caché o no está inicializado, intentar obtenerlos de la API
      console.log(`DeviceStateService: Cargando dispositivos para habitación ${roomId} desde API`);
      const devices = await getDispositivosByHabitacion(roomId);
      
      if (Array.isArray(devices)) {
        // Actualizar caché con estos dispositivos específicos
        this.updateDevicesCache(devices);
        return devices;
      }
      
      return [];
    } catch (error) {
      console.error(`Error al obtener dispositivos para habitación ${roomId}:`, error);
      return [];
    }
  }
  
  /**
   * Cambia el estado de un dispositivo - SOLUCIÓN MEJORADA CONTRA REBOTES
   */
  async toggleDevice(deviceId: number): Promise<boolean> {
    try {
      // Verificar que el dispositivo existe
      const device = this.getDeviceById(deviceId);
      if (!device) {
        console.error(`DeviceStateService: Dispositivo ${deviceId} no encontrado`);
        return false;
      }
      
      // Verificar si ya hay una operación pendiente
      if (this.pendingOperations[deviceId]) {
        console.log(`DeviceStateService: Operación ya en curso para dispositivo ${deviceId}, ignorando`);
        return false;
      }
      
      // Calcular nuevo estado
      const currentState = device.estado;
      const newState = currentState === 1 ? 0 : 1;
      
      // PASO 1: Marcar como operación pendiente
      this.pendingOperations[deviceId] = true;
      
      // PASO 2: Notificar inicio de operación
      eventBus.emit('operation:started', deviceId, 'toggle');
      
      // PASO 3: Actualizar estado en caché de forma optimista
      this.deviceCache[deviceId] = {
        ...device,
        estado: newState
      };
      
      // PASO 4: Notificar cambio de estado (optimista)
      eventBus.emit('device:state-changed', deviceId, newState, 'user');
      
      try {
        // PASO 5: Enviar solicitud al backend
        if (webSocketService.isConnectedNow()) {
          await webSocketService.toggleDeviceState(deviceId, newState);
        } else {
          await apiToggleDevice(deviceId);
        }
        
        // PASO 6: Notificar operación finalizada con éxito
        eventBus.emit('operation:ended', deviceId, 'toggle', true);
        
        // PASO 7: Eliminar de operaciones pendientes (con delay)
        setTimeout(() => {
          delete this.pendingOperations[deviceId];
        }, 500); // Dar tiempo para que las UI se actualicen
        
        return true;
      } catch (error) {
        // PASO 6 alternativo: Revertir estado en caché
        this.deviceCache[deviceId] = {
          ...device,
          estado: currentState
        };
        
        // PASO 7: Notificar error
        eventBus.emit('device:state-changed', deviceId, currentState, 'error');
        eventBus.emit('operation:ended', deviceId, 'toggle', false);
        
        // PASO 8: Eliminar de operaciones pendientes
        delete this.pendingOperations[deviceId];
        
        throw error;
      }
    } catch (error) {
      console.error(`DeviceStateService: Error toggling device ${deviceId}:`, error);
      
      // Asegurarse de que se elimine de operaciones pendientes
      delete this.pendingOperations[deviceId];
      
      // Re-emitir error para que se maneje arriba
      return false;
    }
  }
}

// Singleton - toda la app usará la misma instancia
export const DeviceStateService = new DeviceStateManager();
