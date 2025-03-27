import { getDispositivos, getHabitaciones, getDispositivosByHabitacion } from './api';
import { EventEmitter } from 'events';

// Emisor de eventos para notificar a los componentes sobre cambios
const consumptionEmitter = new EventEmitter();

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

// Objeto para almacenar los datos en caché
const cache = {
  dispositivos: [] as DispositivoConConsumo[],
  dispositvosPorHabitacion: {} as Record<number, DispositivoConConsumo[]>,
  habitaciones: [] as HabitacionConConsumo[],
  consumoTotal: 0,
  top10Ids: [] as number[]
};

// Variables para los intervalos
let actualizacionInterval: NodeJS.Timeout | null = null;
const INTERVALO_ACTUALIZACION = 2000; // 2 segundos

// Eventos disponibles
export const EVENTOS = {
  DISPOSITIVOS_ACTUALIZADOS: 'dispositivos_actualizados',
  HABITACIONES_ACTUALIZADAS: 'habitaciones_actualizadas',
  CONSUMO_TOTAL_ACTUALIZADO: 'consumo_total_actualizado',
  DISPOSITIVOS_HABITACION_ACTUALIZADOS: 'dispositivos_habitacion_actualizados'
};

// Función para obtener todos los dispositivos con sus consumos actualizados
export const obtenerDispositivosConConsumo = async (forceRefresh = false): Promise<DispositivoConConsumo[]> => {
  try {
    // Usar caché si está disponible y no se fuerza actualización
    if (cache.dispositivos.length > 0 && !forceRefresh) {
      return cache.dispositivos;
    }

    // Obtener la lista base de dispositivos
    const dispositivos = await getDispositivos();
    
    // Generar/actualizar consumos para cada dispositivo
    const dispositivosConConsumo = dispositivos.map((dispositivo: Dispositivo) => {
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

    // Guardar en caché
    cache.dispositivos = dispositivosConConsumo;
    
    // Calcular top 10 dispositivos por consumo
    actualizarTop10();

    return dispositivosConConsumo;
  } catch (error) {
    console.error("Error al obtener dispositivos con consumo:", error);
    return [];
  }
};

// Función para obtener dispositivos de una habitación específica con sus consumos
export const obtenerDispositivosHabitacionConConsumo = async (habitacionId: number, forceRefresh = false): Promise<DispositivoConConsumo[]> => {
  try {
    // Usar caché si está disponible y no se fuerza actualización
    if (cache.dispositvosPorHabitacion[habitacionId] && !forceRefresh) {
      return cache.dispositvosPorHabitacion[habitacionId];
    }

    // Obtener dispositivos de esta habitación
    const dispositivos = await getDispositivosByHabitacion(habitacionId);
    
    // Generar/actualizar consumos para cada dispositivo
    const dispositivosConConsumo = dispositivos.map((dispositivo: Dispositivo) => {
      // Buscar si ya tenemos este dispositivo en caché para mantener su consumo
      const existente = cache.dispositivos.find(d => d.id === dispositivo.id);
      
      if (existente) {
        return existente;
      }
      
      // Si no existe, generar nuevo consumo
      const consumo = Math.floor(Math.random() * (3578 - 7 + 1)) + 7;
      
      return {
        ...dispositivo,
        consumo
      };
    });

    // Guardar en caché para esta habitación
    cache.dispositvosPorHabitacion[habitacionId] = dispositivosConConsumo;

    return dispositivosConConsumo;
  } catch (error) {
    console.error(`Error al obtener dispositivos de habitación ${habitacionId}:`, error);
    return [];
  }
};

// Función para obtener habitaciones con consumos calculados
export const obtenerHabitacionesConConsumo = async (forceRefresh = false): Promise<HabitacionConConsumo[]> => {
  try {
    // Usar caché si está disponible y no se fuerza actualización
    if (cache.habitaciones.length > 0 && !forceRefresh) {
      return cache.habitaciones;
    }

    // Obtener la lista base de habitaciones
    const habitaciones = await getHabitaciones();
    
    // Obtener dispositivos con consumos
    const dispositivos = await obtenerDispositivosConConsumo(forceRefresh);
    
    // Calcular el consumo total para cada habitación
    const habitacionesConConsumo = habitaciones.map((habitacion: Habitacion) => {
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
    
    // Guardar en caché
    cache.habitaciones = habitacionesConConsumo;
    
    return habitacionesConConsumo;
  } catch (error) {
    console.error("Error al obtener habitaciones con consumo:", error);
    return [];
  }
};

// Obtener consumo total del sistema
export const obtenerConsumoTotal = (): number => {
  return cache.consumoTotal;
};

// Obtener top 10 IDs de dispositivos por consumo
export const obtenerTop10Ids = (): number[] => {
  return cache.top10Ids;
};

// Calcular y actualizar el top 10 de dispositivos por consumo
const actualizarTop10 = () => {
  if (cache.dispositivos.length === 0) return;
  
  // Ordenar dispositivos por consumo (mayor a menor)
  const dispositivosOrdenados = [...cache.dispositivos].sort((a, b) => 
    Math.abs(b.consumo) - Math.abs(a.consumo)
  );
  
  // Tomar los primeros 10 IDs
  cache.top10Ids = dispositivosOrdenados.slice(0, 10).map(d => d.id);
};

// Actualizar consumos de dispositivos con valores aleatorios
export const actualizarConsumos = async () => {
  // Actualizar consumos de los dispositivos en cache
  cache.dispositivos = cache.dispositivos.map(dispositivo => {
    // Generar variación de ±10% sobre el consumo actual
    let consumo = dispositivo.consumo;
    const variacion = consumo * 0.1 * (Math.random() > 0.5 ? 1 : -1);
    consumo = Math.round(consumo + variacion);
    
    // Asegurar que Garage_Tomas siga siendo negativo (generando)
    if (dispositivo.nombre === "Garage_Tomas") {
      consumo = Math.min(-5000, consumo);
    }
    
    // Asegurar que no sea negativo para otros dispositivos
    if (dispositivo.nombre !== "Garage_Tomas" && consumo < 5) {
      consumo = 5;
    }
    
    return {
      ...dispositivo,
      consumo
    };
  });
  
  // Actualizar consumos para dispositivos por habitación
  Object.keys(cache.dispositvosPorHabitacion).forEach(habitacionIdStr => {
    const habitacionId = parseInt(habitacionIdStr);
    cache.dispositvosPorHabitacion[habitacionId] = cache.dispositvosPorHabitacion[habitacionId].map(dispositivo => {
      // Buscar el dispositivo actualizado en la caché global
      const dispositivoActualizado = cache.dispositivos.find(d => d.id === dispositivo.id);
      
      // Si existe, usar ese valor, de lo contrario generar uno nuevo
      if (dispositivoActualizado) {
        return dispositivoActualizado;
      }
      
      // Generar variación de ±10% sobre el consumo actual
      let consumo = dispositivo.consumo;
      const variacion = consumo * 0.1 * (Math.random() > 0.5 ? 1 : -1);
      consumo = Math.round(consumo + variacion);
      
      // Asegurar consumo mínimo de 5W
      if (consumo < 5) {
        consumo = 5;
      }
      
      return {
        ...dispositivo,
        consumo
      };
    });
    
    // Notificar cambios para esta habitación
    consumptionEmitter.emit(EVENTOS.DISPOSITIVOS_HABITACION_ACTUALIZADOS, habitacionId);
  });
  
  // Recalcular consumos para habitaciones
  cache.habitaciones = cache.habitaciones.map(habitacion => {
    // Filtrar dispositivos que pertenecen a esta habitación
    const dispositivosHabitacion = cache.dispositivos.filter(
      dispositivo => dispositivo.habitacion_id === habitacion.id
    );
    
    // Calcular la suma de consumos
    const consumoTotal = dispositivosHabitacion.reduce(
      (suma, dispositivo) => suma + (dispositivo.consumo || 0), 
      0
    );
    
    return {
      ...habitacion,
      consumo: consumoTotal
    };
  });
  
  // Actualizar consumo total del sistema (puede ser positivo o negativo)
  cache.consumoTotal = cache.dispositivos.reduce(
    (suma, dispositivo) => suma + dispositivo.consumo, 
    0
  );
  
  // Actualizar top 10
  actualizarTop10();
  
  // Emitir eventos para notificar a los componentes
  consumptionEmitter.emit(EVENTOS.DISPOSITIVOS_ACTUALIZADOS);
  consumptionEmitter.emit(EVENTOS.HABITACIONES_ACTUALIZADAS);
  consumptionEmitter.emit(EVENTOS.CONSUMO_TOTAL_ACTUALIZADO);
};

// Iniciar actualización periódica
export const iniciarActualizacionPeriodica = () => {
  if (actualizacionInterval) {
    clearInterval(actualizacionInterval);
  }
  
  // Cargar datos iniciales
  obtenerDispositivosConConsumo(true)
    .then(() => obtenerHabitacionesConConsumo(true))
    .then(() => {
      // Iniciar intervalo de actualización
      actualizacionInterval = setInterval(actualizarConsumos, INTERVALO_ACTUALIZACION);
    });
};

// Detener actualización periódica
export const detenerActualizacionPeriodica = () => {
  if (actualizacionInterval) {
    clearInterval(actualizacionInterval);
    actualizacionInterval = null;
  }
};

// Funciones de suscripción a eventos
export const suscribirseADispositivosActualizados = (callback: () => void) => {
  consumptionEmitter.on(EVENTOS.DISPOSITIVOS_ACTUALIZADOS, callback);
  return () => consumptionEmitter.off(EVENTOS.DISPOSITIVOS_ACTUALIZADOS, callback);
};

export const suscribirseAHabitacionesActualizadas = (callback: () => void) => {
  consumptionEmitter.on(EVENTOS.HABITACIONES_ACTUALIZADAS, callback);
  return () => consumptionEmitter.off(EVENTOS.HABITACIONES_ACTUALIZADAS, callback);
};

export const suscribirseAConsumoTotalActualizado = (callback: () => void) => {
  consumptionEmitter.on(EVENTOS.CONSUMO_TOTAL_ACTUALIZADO, callback);
  return () => consumptionEmitter.off(EVENTOS.CONSUMO_TOTAL_ACTUALIZADO, callback);
};

export const suscribirseADispositivosHabitacionActualizados = (habitacionId: number, callback: () => void) => {
  const callbackWrapper = (id: number) => {
    if (id === habitacionId) {
      callback();
    }
  };
  consumptionEmitter.on(EVENTOS.DISPOSITIVOS_HABITACION_ACTUALIZADOS, callbackWrapper);
  return () => consumptionEmitter.off(EVENTOS.DISPOSITIVOS_HABITACION_ACTUALIZADOS, callbackWrapper);
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
