import axios from 'axios';
import { getToken } from './auth';

// Crear una instancia de Axios con configuración personalizada
const api = axios.create({
  baseURL: 'https://172.16.10.222:8000/api',
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
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Dispositivos
export const getDispositivos = async (): Promise<any> => {
  const response = await api.get('/dispositivos');
  return response.data;
};

export const toggleDevice = async (deviceId: number): Promise<any> => {
  const response = await api.post(`/toggle_device/${deviceId}`);
  return response.data;
};

// Habitaciones
export const getHabitaciones = async (): Promise<any> => {
  const response = await api.get('/habitaciones');
  return response.data;
};

export const createHabitacion = async (nombre: string, tableroId: number): Promise<any> => {
  const response = await api.post('/habitaciones', { nombre, tablero_id: tableroId });
  return response.data;
};

export const updateOrdenHabitaciones = async (habitaciones: { id: number; orden: number }[]): Promise<any> => {
  const response = await api.put('/habitaciones/orden', habitaciones);
  return response.data;
};

export const deleteHabitacion = async (id: number): Promise<any> => {
  const response = await api.delete(`/habitaciones/${id}`);
  return response.data;
};

// Tableros
export const getTableros = async (): Promise<any> => {
  const response = await api.get('/tableros');
  return response.data;
};

export const createTablero = async (nombre: string): Promise<any> => {
  const response = await api.post('/tableros', { nombre });
  return response.data;
};

export const deleteTablero = async (id: number): Promise<any> => {
  const response = await api.delete(`/tableros/${id}`);
  return response.data;
};

export const updateTableroName = async (id: number, nombre: string): Promise<any> => {
  const response = await api.put(`/tableros/${id}`, { nombre });
  return response.data;
};

export const updateOrdenTableros = async (tableros: { id: number; orden: number }[]): Promise<any> => {
  const response = await api.put('/tableros/orden', tableros);
  return response.data;
};

export const getHabitacionesByTablero = async (tableroId: number): Promise<any> => {
  const response = await api.get(`/tableros/${tableroId}/habitaciones`);
  return response.data;
};

// Descubrimiento
export const startDiscovery = async (subredes: string[]): Promise<any> => {
  const response = await api.post('/start_discovery', { subredes });
  return response.data;
};

// Logs
export const getLogs = async (): Promise<any> => {
  const response = await api.get('/logs');
  return response.data;
};

// Usuarios
export const createUser = async (nombre: string, email: string, password: string, rol: string): Promise<any> => {
  const response = await api.post('/usuarios', { nombre, email, password, rol });
  return response.data;
};

// Obtener todos los roles
export const getRoles = async (): Promise<any> => {
  const response = await api.get('/roles');
  return response.data;
};

// Actualizar rol de un usuario
export const updateUserRole = async (userId: number, rol: string): Promise<any> => {
  const response = await api.put(`/usuarios/${userId}/rol`, { rol });
  return response.data;
};

// Agregar función de login
export const loginUser = async (email: string, password: string): Promise<any> => {
  try {
    const response = await api.post('/login', { email, password });
    localStorage.setItem('token', response.data.token);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data;
    } else {
      throw new Error('An unexpected error occurred');
    }
  }
};

export default api;
