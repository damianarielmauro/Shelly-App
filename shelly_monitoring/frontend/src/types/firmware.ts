// Tipos existentes
export interface FirmwareVersionInfo {
  currentVersion: string;
  newVersion: string;
  hasUpdate: boolean;
  releaseNotes?: string;
  releaseDate?: string;
}

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

// Tipo que faltaba y está siendo importado
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

// Tipo auxiliar para FirmwareUpdate
export interface DeviceUpdateInfo {
  id: number;
  nombre: string;
  habitacion_nombre?: string;
  status: 'pending' | 'updating' | 'completed' | 'failed';
  message?: string;
}
