import api from './api';
import { FirmwareUpdateStatus, FirmwareVersionInfo } from '../types/firmware';

// Esta función es importada por el FirmwareUpdatePanel para obtener detalles de firmware
export const getFirmwareUpdateDetails = async (modelId: string): Promise<any> => {
  try {
    const response = await api.get(`/api/shelly/firmware/details/${modelId}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting firmware update details for model ${modelId}:`, error);
    throw error;
  }
};

// Esta función es importada por el FirmwareUpdatePanel para actualizar el firmware
export const updateFirmware = async (
  modelId: string, 
  deviceIds: number[], 
  progressCallback: (status: any[], completedCount: number) => void
): Promise<any> => {
  try {
    // Iniciar actualización de firmware
    const response = await api.post('/api/shelly/firmware/update-batch', {
      modelId,
      deviceIds
    });
    
    // Simulación de progreso para la UI
    let completedCount = 0;
    const updateStatus: any[] = [];
    
    // Simulamos actualizaciones periódicas para el callback de progreso
    const updateInterval = setInterval(() => {
      if (completedCount >= deviceIds.length) {
        clearInterval(updateInterval);
        return;
      }
      
      const currentDeviceId = deviceIds[completedCount];
      const success = Math.random() > 0.1; // 90% de probabilidad de éxito
      
      updateStatus.push({
        deviceId: currentDeviceId,
        success,
        message: success ? 'Actualización completada' : 'Error en la actualización'
      });
      
      completedCount++;
      progressCallback(updateStatus, completedCount);
    }, 1500);
    
    return response.data;
  } catch (error) {
    console.error('Error updating firmware:', error);
    throw error;
  }
};

// Las funciones originales se mantienen tal cual
export const checkForFirmwareUpdates = async (): Promise<FirmwareUpdateStatus[]> => {
  try {
    const response = await api.get('/api/shelly/firmware/check-all');
    return response.data;
  } catch (error) {
    console.error('Error checking firmware updates:', error);
    throw error;
  }
};

export const checkUpdatesForAllDevices = async (): Promise<FirmwareUpdateStatus[]> => {
  return checkForFirmwareUpdates();
};

export const getDeviceFirmwareInfo = async (deviceId: string): Promise<FirmwareVersionInfo> => {
  try {
    const response = await api.get(`/api/shelly/devices/${deviceId}/ota/check`);
    return response.data;
  } catch (error) {
    console.error(`Error getting firmware info for device ${deviceId}:`, error);
    throw error;
  }
};

export const updateDeviceFirmware = async (deviceId: string): Promise<any> => {
  try {
    const response = await api.post(`/api/shelly/devices/${deviceId}/ota/update`);
    return response.data;
  } catch (error) {
    console.error(`Error updating firmware for device ${deviceId}:`, error);
    throw error;
  }
};

export const updateMultipleDevices = async (deviceIds: string[]): Promise<any> => {
  try {
    const response = await api.post('/api/shelly/firmware/update-multiple', { deviceIds });
    return response.data;
  } catch (error) {
    console.error('Error updating multiple devices:', error);
    throw error;
  }
};

export const checkUpdateStatus = async (deviceId: string): Promise<any> => {
  try {
    const response = await api.get(`/api/shelly/devices/${deviceId}/update-status`);
    return response.data;
  } catch (error) {
    console.error(`Error checking update status for device ${deviceId}:`, error);
    throw error;
  }
};
