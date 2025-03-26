import { getDispositivos, getHabitaciones } from './api';

// Interfaces para tipar los datos
export interface DispositivoConConsumo {
  id: number;
  nombre: string;
  habitacion_id?: number | null;
  consumo: number;
  [key: string]: any;
}

// Interfaz para dispositivo sin consumo (como llega de la API)
interface Dispositivo {
  id: number;
  nombre: string;
  habitacion_id?: number | null;
  [key: string]: any;
}

export interface HabitacionConConsumo {
  id: number;
  nombre: string;
  tablero_id: number;
  consumo: number;
  [key: string]: any;
}

// Interfaz para habitación sin consumo (como llega de la API)
interface Habitacion {
  id: number;
  nombre: string;
  tablero_id: number;
  [key: string]: any;
}

// Función para obtener todos los dispositivos con sus consumos actualizados
export const obtenerDispositivosConConsumo = async (): Promise<DispositivoConConsumo[]> => {
  try {
    // Obtener la lista base de dispositivos
    const dispositivos = await getDispositivos();
    
    // Generar/actualizar consumos para cada dispositivo
    return dispositivos.map((dispositivo: Dispositivo) => {
      let consumo: number;
      
      // Asignación especial para dispositivo Garage_Tomas (generación)
      if (dispositivo.nombre === "Garage_Tomas") {
        consumo = -12800; // -12.80kW
      } else {
        // Valores aleatorios para el resto de dispositivos entre 7W y 3578W
        consumo = Math.floor(Math.random() * (3578 - 7 + 1)) + 7;
      }
      
      return {
        ...dispositivo,
        consumo
      };
    });
    
    // Cuando implementemos la obtención de datos reales, 
    // simplemente reemplazaremos esta lógica sin afectar al resto de la aplicación
    
  } catch (error) {
    console.error("Error al obtener dispositivos con consumo:", error);
    return [];
  }
};

// Función para obtener habitaciones con consumos calculados
export const obtenerHabitacionesConConsumo = async (): Promise<HabitacionConConsumo[]> => {
  try {
    // Obtener la lista base de habitaciones
    const habitaciones = await getHabitaciones();
    
    // Obtener dispositivos con consumos
    const dispositivos = await obtenerDispositivosConConsumo();
    
    // Calcular el consumo total para cada habitación
    return habitaciones.map((habitacion: Habitacion) => {
      // Filtrar dispositivos que pertenecen a esta habitación
      const dispositivosHabitacion = dispositivos.filter(
        (dispositivo: DispositivoConConsumo) => dispositivo.habitacion_id === habitacion.id
      );
      
      // Calcular la suma de consumos
      const consumoTotal = dispositivosHabitacion.reduce(
        (suma: number, dispositivo: DispositivoConConsumo) => suma + (dispositivo.consumo || 0), 
        0
      );
      
      return {
        ...habitacion,
        consumo: consumoTotal
      };
    });
    
  } catch (error) {
    console.error("Error al obtener habitaciones con consumo:", error);
    return [];
  }
};

// Función para formatear valores de consumo
export const formatearConsumo = (consumo: number): string => {
  const absConsumo = Math.abs(consumo);
  
  if (absConsumo < 1000) {
    return `${consumo} W`;
  } else {
    return `${(consumo / 1000).toFixed(2)} kW`;
  }
};

// Función para determinar el color según el valor de consumo
export const getColorForConsumo = (consumo: number): string => {
  return consumo >= 0 ? '#1ECAFF' : '#00ff00'; // Azul claro para consumo, verde para generación
};
