// Tipos para verificar actualizaciones
export interface FirmwareVersionInfo {
  currentVersion: string;
  newVersion: string;
  hasUpdate: boolean;
  releaseNotes?: string;
  releaseDate?: string;
}

// Estado de actualización para un dispositivo
export interface FirmwareUpdateStatus {
  deviceId: string;
  deviceName: string;
  hasUpdate: boolean;
  currentVersion: string;
  newVersion?: string;
  status: 'up-to-date' | 'update-available' | 'updating' | 'error';
  message?: string;
  lastCheck: string;
}

// Tipo para representar actualizaciones de firmware agrupadas por modelo
export interface FirmwareUpdate {
  modelId: string;
  modelName: string;
  currentVersion: string;
  newVersion: string;
  releaseDate: string;
  releaseNotes: string;
  deviceCount: number;
  devices?: DeviceUpdateInfo[];
}

// Información de actualización para un dispositivo específico
export interface DeviceUpdateInfo {
  id: number;
  nombre: string;
  habitacion_nombre?: string;
  status: 'pending' | 'updating' | 'completed' | 'failed';
  message?: string;
}
