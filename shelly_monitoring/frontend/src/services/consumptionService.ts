import { getDispositivos, getHabitaciones } from './api';

// Interface para los datos de consumo
export interface DispositivoConConsumo {
  id: number;
  nombre: string;
  habitacion_id: number | null;
  habitacion_nombre?: string;
  consumo: number;
  // otros campos que pueda tener el dispositivo
}

export interface HabitacionConConsumo {
  id: number;
  nombre: string;
  consumo: number;
  tablero_id: number;
  // otros campos que pueda tener la habitación
}

// Cache de datos de consumo
let dispositivosCache: DispositivoConConsumo[] = [];
let habitacionesCache: HabitacionConConsumo[] = [];
let ultimaActualizacion: number = 0;
const INTERVALO_REFRESCO = 2000; // 2 segundos en ms

/**
 * Obtiene dispositivos con sus datos de consumo
 * Esta función simula la obtención de datos de consumo, pero está diseñada
 * para ser fácilmente reemplazable por una implementación que obtenga datos reales
 */
export const obtenerDispositivosConConsumo = async (): Promise<DispositivoConConsumo[]> => {
  const ahora = Date.now();
  
  // Si han pasado menos de 2 segundos y tenemos datos en cache, devolver la cache
  if (ahora - ultimaActualizacion < INTERVALO_REFRESCO && dispositivosCache.length > 0) {
    return dispositivosCache;
  }
  
  try {
    // Obtener lista base de dispositivos
    const dispositivos = await getDispositivos();
    
    // Asignar valores de consumo simulados
    // ESTE ES EL PUNTO DONDE SE REEMPLAZARÁ LA LÓGICA PARA OBTENER DATOS REALES
    dispositivosCache = dispositivos.map((dispositivo: any) => {
      let consumo;
      if (dispositivo.nombre === "Garage_Tomas") {
        consumo = -12800; // -12.80kW para Garage_Tomas
      } else {
        consumo = Math.floor(Math.random() * (3578 - 7 + 1)) + 7; // Valor entre 7W y 3578W
      }
      
      return {
        ...dispositivo,
        consumo
      };
    });
    
    ultimaActualizacion = ahora;
    return dispositivosCache;
  } catch (error) {
    console.error('Error al obtener dispositivos con consumo:', error);
    throw error;
  }
};

/**
 * Obtiene habitaciones con el consumo total calculado
 */
export const obtenerHabitacionesConConsumo = async (): Promise<HabitacionConConsumo[]> => {
  try {
    // Obtener habitaciones y dispositivos con consumo
    const habitacionesData = await getHabitaciones();
    const dispositivos = await obtenerDispositivosConConsumo();
    
    // Calcular consumo por habitación
    const habitacionesConConsumo = habitacionesData.map((habitacion: any) => {
      const consumoTotal = calcularConsumoHabitacion(habitacion.id, dispositivos);
      
      return {
        ...habitacion,
        consumo: consumoTotal
      };
    });
    
    habitacionesCache = habitacionesConConsumo;
    return habitacionesConConsumo;
  } catch (error) {
    console.error('Error al obtener habitaciones con consumo:', error);
    throw error;
  }
};

/**
 * Calcula el consumo total de una habitación sumando los consumos de sus dispositivos
 * @param habitacionId ID de la habitación
 * @param dispositivos Lista de dispositivos con consumo
 */
export const calcularConsumoHabitacion = (
  habitacionId: number, 
  dispositivos: DispositivoConConsumo[]
): number => {
  return dispositivos
    .filter(d => d.habitacion_id === habitacionId)
    .reduce((total, dispositivo) => total + dispositivo.consumo, 0);
};

/**
 * Formatea un valor de consumo para mostrarlo (W o kW)
 * @param consumo Valor de consumo en watts
 */
export const formatearConsumo = (consumo: number): string => {
  if (consumo < 1000 && consumo > -1000) {
    return `${consumo} W`;
  } else {
    return `${(consumo / 1000).toFixed(2)} kW`;
  }
};
