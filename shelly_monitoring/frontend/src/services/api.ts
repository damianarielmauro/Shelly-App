import axios from 'axios';
import { getToken } from './auth';

// Crear una instancia de Axios con configuración personalizada
const api = axios.create({
  // Cambia esta línea para usar la URL relativa en lugar de la absoluta
  baseURL: '/api', 
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir el token de autorización a cada solicitud
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    console.log('Interceptor: Adding token to request', token); // Log de depuración
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No token found in localStorage');
    }
    return config;
  },
  (error) => {
    console.error('Interceptor error:', error); // Log de depuración
    return Promise.reject(error);
  }
);

// Dispositivos
export const getDispositivos = async (): Promise<any> => {
  try {
    const response = await api.get('/dispositivos');
    console.log('getDispositivos response:', response);
    return response.data;
  } catch (error) {
    console.error('getDispositivos error:', error);
    throw error;
  }
};

export const toggleDevice = async (deviceId: number): Promise<any> => {
  try {
    const response = await api.post(`/toggle_device/${deviceId}`);
    console.log('toggleDevice response:', response);
    return response.data;
  } catch (error) {
    console.error('toggleDevice error:', error);
    throw error;
  }
};

// Habitaciones
export const getHabitaciones = async (): Promise<any> => {
  try {
    const response = await api.get('/habitaciones');
    console.log('getHabitaciones response:', response);
    return response.data;
  } catch (error) {
    console.error('getHabitaciones error:', error);
    throw error;
  }
};

export const createHabitacion = async (nombre: string, tableroId: number): Promise<any> => {
  try {
    const response = await api.post('/habitaciones', { nombre, tablero_id: tableroId });
    console.log('createHabitacion response:', response);
    return response.data;
  } catch (error) {
    console.error('createHabitacion error:', error);
    throw error;
  }
};

export const updateOrdenHabitaciones = async (habitaciones: { id: number; orden: number }[]): Promise<any> => {
  try {
    const response = await api.put('/habitaciones/orden', habitaciones);
    console.log('updateOrdenHabitaciones response:', response);
    return response.data;
  } catch (error) {
    console.error('updateOrdenHabitaciones error:', error);
    throw error;
  }
};

export const deleteHabitacion = async (id: number): Promise<any> => {
  try {
    const response = await api.delete(`/habitaciones/${id}`);
    console.log('deleteHabitacion response:', response);
    return response.data;
  } catch (error) {
    console.error('deleteHabitacion error:', error);
    throw error;
  }
};

// Asignar dispositivos a una habitación
export const asignarHabitacion = async (deviceIds: number[], habitacionId: number | null): Promise<any> => {
  try {
    const response = await api.post('/asignar_habitacion', {
      device_ids: deviceIds,
      habitacion_id: habitacionId,
    });
    console.log('asignarHabitacion response:', response);
    return response.data;
  } catch (error) {
    console.error('asignarHabitacion error:', error);
    throw error;
  }
};

// Obtener dispositivos por habitación
export const getDispositivosByHabitacion = async (habitacionId: number): Promise<any> => {
  const response = await api.get(`/habitaciones/${habitacionId}/dispositivos`);
  return response.data;
};

// Actualizar orden de dispositivos dentro de una habitación
export const updateOrdenDispositivos = async (dispositivos: { id: number; orden: number }[]): Promise<any> => {
  try {
    const response = await api.put('/dispositivos/orden', dispositivos);
    console.log('updateOrdenDispositivos response:', response);
    return response.data;
  } catch (error) {
    console.error('updateOrdenDispositivos error:', error);
    throw error;
  }
};

// Tableros
export const getTableros = async (): Promise<any> => {
  try {
    const response = await api.get('/tableros');
    console.log('getTableros response:', response);
    return response.data;
  } catch (error) {
    console.error('getTableros error:', error);
    throw error;
  }
};

export const createTablero = async (nombre: string): Promise<any> => {
  try {
    const response = await api.post('/tableros', { nombre });
    console.log('createTablero response:', response);
    return response.data;
  } catch (error) {
    console.error('createTablero error:', error);
    throw error;
  }
};

export const deleteTablero = async (id: number): Promise<any> => {
  try {
    const response = await api.delete(`/tableros/${id}`);
    console.log('deleteTablero response:', response);
    return response.data;
  } catch (error) {
    console.error('deleteTablero error:', error);
    throw error;
  }
};

export const updateTableroName = async (id: number, nombre: string): Promise<any> => {
  try {
    console.log(`Enviando petición para renombrar tablero ${id} a "${nombre}"`);
    const response = await api.put(`/tableros/${id}/renombrar`, { nombre });
    console.log('updateTableroName response:', response);
    return response.data;
  } catch (error) {
    console.error('updateTableroName error:', error);
    throw error;
  }
};

export const updateOrdenTableros = async (tableros: { id: number; orden: number }[]): Promise<any> => {
  try {
    const response = await api.put('/tableros/orden', tableros);
    console.log('updateOrdenTableros response:', response);
    return response.data;
  } catch (error) {
    console.error('updateOrdenTableros error:', error);
    throw error;
  }
};

export const getHabitacionesByTablero = async (tableroId: number): Promise<any> => {
  try {
    const response = await api.get(`/tableros/${tableroId}/habitaciones`);
    console.log('getHabitacionesByTablero response:', response);
    return response.data;
  } catch (error) {
    console.error('getHabitacionesByTablero error:', error);
    throw error;
  }
};

/**
 * Renombrar una habitación
 * @param id ID de la habitación a renombrar
 * @param nombre Nuevo nombre para la habitación
 * @returns Respuesta de la API
 */
export const renameHabitacion = async (id: number, nombre: string): Promise<any> => {
  try {
    console.log(`Enviando petición para renombrar habitación ${id} a "${nombre}"`);
    const response = await api.put(`/habitaciones/${id}/renombrar`, { nombre });
    console.log('renameHabitacion response:', response);
    return response.data;
  } catch (error) {
    console.error('renameHabitacion error:', error);
    throw error;
  }
};

/**
 * Cambiar una habitación de un tablero a otro
 * @param habitacionId ID de la habitación a mover
 * @param tableroId ID del tablero destino
 * @returns Respuesta de la API
 */
export const cambiarTableroHabitacion = async (habitacionId: number, tableroId: number): Promise<any> => {
  try {
    console.log(`Enviando petición para mover habitación ${habitacionId} al tablero ${tableroId}`);
    const response = await api.put(`/habitaciones/${habitacionId}/cambiar-tablero`, { tablero_id: tableroId });
    console.log('cambiarTableroHabitacion response:', response);
    return response.data;
  } catch (error) {
    console.error('cambiarTableroHabitacion error:', error);
    throw error;
  }
};

// Descubrimiento
export const startDiscovery = async (subredes: string[]): Promise<any> => {
  try {
    const response = await api.post('/start_discovery', { subredes });
    console.log('startDiscovery response:', response);
    return response.data;
  } catch (error) {
    console.error('startDiscovery error:', error);
    throw error;
  }
};

// Logs
export const getLogs = async (): Promise<any> => {
  try {
    const response = await api.get('/logs');
    console.log('getLogs response:', response);
    return response.data;
  } catch (error) {
    console.error('getLogs error:', error);
    throw error;
  }
};

// Usuarios
export const createUser = async (nombre: string, email: string, password: string, rol: string): Promise<any> => {
  try {
    const response = await api.post('/usuarios', { nombre, email, password, rol });
    console.log('createUser response:', response);
    return response.data;
  } catch (error) {
    console.error('createUser error:', error);
    throw error;
  }
};

// Obtener todos los roles
export const getRoles = async (): Promise<any> => {
  try {
    const response = await api.get('/roles');
    console.log('getRoles response:', response);
    return response.data;
  } catch (error) {
    console.error('getRoles error:', error);
    throw error;
  }
};

// Obtener todos los usuarios
export const getUsers = async (): Promise<any> => {
  try {
    const response = await api.get('/usuarios');
    console.log('getUsers response:', response);
    return response.data;
  } catch (error) {
    console.error('getUsers error:', error);
    throw error;
  }
};

// Eliminar un usuario
export const deleteUser = async (id: number): Promise<any> => {
  try {
    const response = await api.delete(`/usuarios/${id}`);
    console.log('deleteUser response:', response);
    return response.data;
  } catch (error) {
    console.error('deleteUser error:', error);
    throw error;
  }
};

// Actualizar rol de un usuario
export const updateUserRole = async (userId: number, rol: string): Promise<any> => {
  try {
    const response = await api.put(`/usuarios/${userId}/rol`, { rol });
    console.log('updateUserRole response:', response);
    return response.data;
  } catch (error) {
    console.error('updateUserRole error:', error);
    throw error;
  }
};

// Obtener permisos de un usuario
export const getUserPermissions = async (userId: number): Promise<any> => {
  try {
    const response = await api.get(`/get_user_permissions/${userId}`);
    console.log('getUserPermissions response:', response);
    return response.data;
  } catch (error) {
    console.error('getUserPermissions error:', error);
    throw error;
  }
};

// Guardar permisos de un usuario
export const saveUserPermissions = async (userId: number, roomIds: number[]): Promise<any> => {
  try {
    const response = await api.post('/save_user_permissions', { user_id: userId, room_ids: roomIds });
    console.log('saveUserPermissions response:', response);
    return response.data;
  } catch (error) {
    console.error('saveUserPermissions error:', error);
    throw error;
  }
};

// Agregar función de login
export const loginUser = async (email: string, password: string): Promise<any> => {
  try {
    const response = await api.post('/login', { email, password });
    localStorage.setItem('token', response.data.token);
    console.log('loginUser response:', response);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('loginUser axios error:', error);
      throw error.response?.data;
    } else {
      console.error('loginUser unexpected error:', error);
      throw new Error('An unexpected error occurred');
    }
  }
};

export const getRooms = getHabitaciones; // Alias para getRooms

// === Servicios para la comunicación con Shelly.ioAdapter ===

/**
 * Obtiene todos los dispositivos Shelly descubiertos por el adaptador
 */
export const getShellyDevices = async (): Promise<any> => {
  try {
    const response = await api.get('/shelly/devices');
    console.log('getShellyDevices response:', response);
    return response.data;
  } catch (error) {
    console.error('getShellyDevices error:', error);
    return [];
  }
};

/**
 * Inicia el descubrimiento de dispositivos Shelly
 */
export const discoverShellyDevices = async (): Promise<any> => {
  try {
    const response = await api.post('/shelly/discover');
    console.log('discoverShellyDevices response:', response);
    return response.data;
  } catch (error) {
    console.error('discoverShellyDevices error:', error);
    throw error;
  }
};

/**
 * Sincroniza los dispositivos Shelly con la base de datos
 */
export const syncShellyDevices = async (): Promise<any> => {
  try {
    const response = await api.post('/shelly/sync_database');
    console.log('syncShellyDevices response:', response);
    return response.data;
  } catch (error) {
    console.error('syncShellyDevices error:', error);
    throw error;
  }
};

/**
 * Obtiene información detallada de un dispositivo Shelly
 */
export const getShellyDeviceInfo = async (deviceId: string): Promise<any> => {
  try {
    const response = await api.get(`/shelly/devices/${deviceId}`);
    console.log('getShellyDeviceInfo response:', response);
    return response.data;
  } catch (error) {
    console.error(`Error obteniendo información del dispositivo ${deviceId}:`, error);
    return null;
  }
};

/**
 * Controla un dispositivo Shelly (encendido/apagado)
 */
export const controlShellyDevice = async (deviceId: string, channel: number, state: boolean): Promise<any> => {
  try {
    const response = await api.post(`/shelly/devices/${deviceId}/control`, {
      channel,
      state
    });
    console.log('controlShellyDevice response:', response);
    return response.data;
  } catch (error) {
    console.error(`Error controlando dispositivo ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Verifica si hay actualizaciones de firmware disponibles
 */
export const checkShellyFirmware = async (deviceId: string): Promise<any> => {
  try {
    const response = await api.get(`/shelly/devices/${deviceId}/firmware`);
    console.log('checkShellyFirmware response:', response);
    return response.data;
  } catch (error) {
    console.error(`Error verificando firmware para ${deviceId}:`, error);
    return null;
  }
};

/**
 * Inicia la actualización de firmware para un dispositivo
 */
export const updateShellyFirmware = async (deviceId: string): Promise<any> => {
  try {
    const response = await api.post(`/shelly/devices/${deviceId}/firmware/update`);
    console.log('updateShellyFirmware response:', response);
    return response.data;
  } catch (error) {
    console.error(`Error actualizando firmware para ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Obtiene datos de consumo energético de un dispositivo
 */
export const getShellyEnergyData = async (deviceId: string): Promise<any> => {
  try {
    const response = await api.get(`/shelly/devices/${deviceId}/energy`);
    console.log('getShellyEnergyData response:', response);
    return response.data;
  } catch (error) {
    console.error(`Error obteniendo datos de energía para ${deviceId}:`, error);
    return null;
  }
};

export default api;
