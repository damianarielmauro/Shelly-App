import api from './api';

/**
 * Obtiene todos los dispositivos Shelly descubiertos por el adaptador
 */
export const getShellyDevices = async () => {
  try {
    const response = await api.get('/api/shelly/devices');
    return response.data;
  } catch (error) {
    console.error('Error al obtener dispositivos Shelly:', error);
    throw error;
  }
};

/**
 * Inicia un descubrimiento de dispositivos Shelly
 */
export const discoverShellyDevices = async () => {
  try {
    const response = await api.post('/api/shelly/discover');
    return response.data;
  } catch (error) {
    console.error('Error al iniciar descubrimiento Shelly:', error);
    throw error;
  }
};

/**
 * Obtiene información detallada de un dispositivo Shelly
 * @param deviceId ID del dispositivo Shelly
 */
export const getShellyDeviceInfo = async (deviceId: string) => {
  try {
    const response = await api.get(`/api/shelly/devices/${deviceId}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener información del dispositivo ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Obtiene el estado actual de un dispositivo Shelly
 * @param deviceId ID del dispositivo Shelly
 */
export const getShellyDeviceStatus = async (deviceId: string) => {
  try {
    const response = await api.get(`/api/shelly/devices/${deviceId}/status`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener estado del dispositivo ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Controla un dispositivo Shelly (encender/apagar)
 * @param deviceId ID del dispositivo Shelly
 * @param channel Canal a controlar (generalmente 0 para el primero)
 * @param state True para encender, False para apagar
 */
export const controlShellyDevice = async (deviceId: string, channel: number, state: boolean) => {
  try {
    const response = await api.post(`/api/shelly/devices/${deviceId}/control`, {
      channel,
      state
    });
    return response.data;
  } catch (error) {
    console.error(`Error al controlar el dispositivo ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Verifica si hay actualizaciones de firmware disponibles para un dispositivo
 * @param deviceId ID del dispositivo Shelly
 */
export const checkShellyFirmware = async (deviceId: string) => {
  try {
    const response = await api.get(`/api/shelly/devices/${deviceId}/firmware`);
    return response.data;
  } catch (error) {
    console.error(`Error al verificar firmware del dispositivo ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Inicia la actualización de firmware para un dispositivo
 * @param deviceId ID del dispositivo Shelly
 */
export const updateShellyFirmware = async (deviceId: string) => {
  try {
    const response = await api.post(`/api/shelly/devices/${deviceId}/firmware/update`);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar firmware del dispositivo ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Obtiene datos de consumo energético para dispositivos compatibles
 * @param deviceId ID del dispositivo Shelly
 */
export const getShellyEnergyData = async (deviceId: string) => {
  try {
    const response = await api.get(`/api/shelly/devices/${deviceId}/energy`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener datos de energía del dispositivo ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Sincroniza los dispositivos Shelly descubiertos con la base de datos
 */
export const syncShellyDevices = async () => {
  try {
    const response = await api.post('/api/shelly/sync_database');
    return response.data;
  } catch (error) {
    console.error('Error al sincronizar dispositivos Shelly:', error);
    throw error;
  }
};
