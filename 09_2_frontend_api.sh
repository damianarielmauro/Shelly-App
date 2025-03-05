#!/bin/bash

echo "*****************************************"
echo "*        09_2_frontend_api              *"
echo "*****************************************"

# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"

# Crear el archivo src/services/api.ts
cat <<'EOF' > src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://172.16.10.222:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dispositivos
export const getDispositivos = async () => {
  const response = await api.get('/dispositivos');
  return response.data;
};

export const toggleDevice = async (deviceId: number) => {
  const response = await api.post(`/toggle_device/${deviceId}`);
  return response.data;
};

// Habitaciones
export const getHabitaciones = async () => {
  const response = await api.get('/habitaciones');
  return response.data;
};

export const createHabitacion = async (nombre: string, tableroId: number) => {
  const response = await api.post('/habitaciones', { nombre, tablero_id: tableroId });
  return response.data;
};

export const updateOrdenHabitaciones = async (habitaciones: { id: number; orden: number }[]) => {
  const response = await api.put('/habitaciones/orden', habitaciones);
  return response.data;
};

export const deleteHabitacion = async (id: number) => {
  const response = await api.delete(`/habitaciones/${id}`);
  return response.data;
};

// Tableros
export const getTableros = async () => {
  const response = await api.get('/tableros');
  return response.data;
};

export const createTablero = async (nombre: string) => {
  const response = await api.post('/tableros', { nombre });
  return response.data;
};

export const deleteTablero = async (id: number) => {
  const response = await api.delete(`/tableros/${id}`);
  return response.data;
};

export const updateTableroName = async (id: number, nombre: string) => {
  const response = await api.put(`/tableros/${id}`, { nombre });
  return response.data;
};

export const updateOrdenTableros = async (tableros: { id: number; orden: number }[]) => {
  const response = await api.put('/tableros/orden', tableros);
  return response.data;
};

// Descubrimiento
export const startDiscovery = async (subredes: string[]) => {
  const response = await api.post('/start_discovery', { subredes });
  return response.data;
};

// Logs
export const getLogs = async () => {
  const response = await api.get('/logs');
  return response.data;
};

export default api;
EOF
