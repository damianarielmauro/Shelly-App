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
  ultimoConsumoEmitido?: number;
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
  ultimoConsumoEmitido?: number;
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
  ultimoConsumoTotalEmitido: 0,
  top10Ids: [] as number[],
  ultimaActualizacion: Date.now(),
  emisionsEnCurso: false // Flag para controlar emisiones y evitar solapamiento
};

// Variables para los intervalos
let actualizacionInterval: NodeJS.Timeout | null = null;
const INTERVALO_ACTUALIZACION = 4000; // 4 segundos

// Configuración para el sistema de debounce y throttling
const UMBRAL_CAMBIO_CONSUMO_PORCENTAJE = 7; // Aumentado a 7%
const UMBRAL_CAMBIO_CONSUMO_MINIMO = 20; // Aumentado a 20W

// Intervalo mínimo entre emisiones de eventos (ms)
const INTERVALO_MINIMO_EMISIONES = 4000; // Coincide con el intervalo de actualización

// Últimas veces que se emitieron eventos
const ultimasEmisiones = {
  dispositivos: 0,
  habitaciones: 0,
  consumoTotal: 0,
  habitacionesEspecificas: {} as Record<number, number>
};

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
        consumo,
        ultimoConsumoEmitido: consumo
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
      
      // Si no existe, generar nuevo consumo (excepto caso especial)
      let consumo: number;
      
      // Asignación especial para dispositivo Garage_Tomas (generación)
      if (dispositivo.nombre === "Garage_Tomas") {
        consumo = -12800; // -12.80kW
      } else {
        consumo = Math.floor(Math.random() * (3578 - 7 + 1)) + 7;
      }
      
      return {
        ...dispositivo,
        consumo,
        ultimoConsumoEmitido: consumo
      };
    });

    // Guardar en caché para esta habitación
    cache.dispositvosPorHabitacion[habitacionId] = dispositivosConConsumo;
    
    // Actualizar también los dispositivos en la caché global
    dispositivosConConsumo.forEach((dispositivo: DispositivoConConsumo) => {
      const index = cache.dispositivos.findIndex(d => d.id === dispositivo.id);
      if (index >= 0) {
        cache.dispositivos[index] = dispositivo;
      } else {
        cache.dispositivos.push(dispositivo);
      }
    });

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
    
    // Asegurar que tenemos los dispositivos actualizados
    const dispositivos = await obtenerDispositivosConConsumo(forceRefresh);
    
    // Calcular el consumo total para cada habitación basado en sus dispositivos
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
        consumo: consumoTotal,
        ultimoConsumoEmitido: consumoTotal
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

// Comprobar si un cambio de consumo supera el umbral para actualizarse
const superaUmbralCambio = (valorAnterior: number, valorActual: number): boolean => {
  if (valorAnterior === undefined) return true;
  
  const cambioAbsoluto = Math.abs(valorActual - valorAnterior);
  
  // Si el cambio es mayor que el umbral mínimo
  if (cambioAbsoluto >= UMBRAL_CAMBIO_CONSUMO_MINIMO) {
    // Y además el cambio porcentual es significativo
    const cambioPorcentual = valorAnterior !== 0 ? (cambioAbsoluto / Math.abs(valorAnterior)) * 100 : 100;
    return cambioPorcentual >= UMBRAL_CAMBIO_CONSUMO_PORCENTAJE;
  }
  
  return false;
};

// Verificar si ha pasado suficiente tiempo para emitir otro evento
const puedeEmitirEvento = (tipoEvento: string, id?: number): boolean => {
  const ahora = Date.now();
  
  if (id !== undefined) {
    // Para eventos específicos de habitaciones
    const ultimaEmision = ultimasEmisiones.habitacionesEspecificas[id] || 0;
    if (ahora - ultimaEmision >= INTERVALO_MINIMO_EMISIONES) {
      ultimasEmisiones.habitacionesEspecificas[id] = ahora;
      return true;
    }
  } else {
    // Para eventos generales
    let ultimaEmision = 0;
    
    switch (tipoEvento) {
      case EVENTOS.DISPOSITIVOS_ACTUALIZADOS:
        ultimaEmision = ultimasEmisiones.dispositivos;
        if (ahora - ultimaEmision >= INTERVALO_MINIMO_EMISIONES) {
          ultimasEmisiones.dispositivos = ahora;
          return true;
        }
        break;
      case EVENTOS.HABITACIONES_ACTUALIZADAS:
        ultimaEmision = ultimasEmisiones.habitaciones;
        if (ahora - ultimaEmision >= INTERVALO_MINIMO_EMISIONES) {
          ultimasEmisiones.habitaciones = ahora;
          return true;
        }
        break;
      case EVENTOS.CONSUMO_TOTAL_ACTUALIZADO:
        ultimaEmision = ultimasEmisiones.consumoTotal;
        if (ahora - ultimaEmision >= INTERVALO_MINIMO_EMISIONES) {
          ultimasEmisiones.consumoTotal = ahora;
          return true;
        }
        break;
    }
  }
  
  return false;
};

// Calcular y actualizar el top 10 de dispositivos por consumo
const actualizarTop10 = () => {
  if (cache.dispositivos.length === 0) return;
  
  // Ordenar dispositivos por consumo absoluto (mayor a menor)
  const dispositivosOrdenados = [...cache.dispositivos].sort((a, b) => 
    Math.abs(b.consumo) - Math.abs(a.consumo)
  );
  
  // Tomar los primeros 10 IDs
  cache.top10Ids = dispositivosOrdenados.slice(0, 10).map(d => d.id);
};

// Función para emitir eventos de forma controlada
const emitirEventoControlado = (tipoEvento: string, id?: number) => {
  if (puedeEmitirEvento(tipoEvento, id)) {
    if (id !== undefined) {
      consumptionEmitter.emit(tipoEvento, id);
    } else {
      consumptionEmitter.emit(tipoEvento);
    }
    return true;
  }
  return false;
};

// Actualizar consumos de dispositivos con valores aleatorios
export const actualizarConsumos = async () => {
  // Si ya hay una emisión en curso, salir
  if (cache.emisionsEnCurso) {
    return;
  }
  
  cache.emisionsEnCurso = true;
  
  const ahora = Date.now();
  const tiempoDesdeUltimaActualizacion = ahora - cache.ultimaActualizacion;
  
  // Actualizar el tiempo de la última actualización
  cache.ultimaActualizacion = ahora;
  
  // Variables para seguimiento de cambios significativos
  let dispositivosCambiados = false;
  let habitacionesCambiadas = false;
  let consumoTotalCambiado = false;
  const habitacionesCambiadasIds: number[] = [];

  try {
    // Actualizar consumos de los dispositivos en cache con menor variación
    cache.dispositivos = cache.dispositivos.map((dispositivo: DispositivoConConsumo) => {
      // Generar variación más pequeña: ±3% sobre el consumo actual
      let consumo = dispositivo.consumo;
      const variacion = consumo * 0.03 * (Math.random() > 0.5 ? 1 : -1);
      consumo = Math.round(consumo + variacion);
      
      // Asegurar que Garage_Tomas siga siendo negativo (generando)
      if (dispositivo.nombre === "Garage_Tomas") {
        consumo = Math.min(-5000, consumo);
      }
      
      // Asegurar que no sea negativo para otros dispositivos
      if (dispositivo.nombre !== "Garage_Tomas" && consumo < 5) {
        consumo = 5;
      }
      
      // Comprobar si el cambio es significativo para el debounce
      const cambioSignificativo = superaUmbralCambio(
        dispositivo.ultimoConsumoEmitido || 0, 
        consumo
      );
      
      // Si hay cambio significativo, actualizar el valor emitido y marcar
      if (cambioSignificativo) {
        dispositivosCambiados = true;
        return {
          ...dispositivo,
          consumo,
          ultimoConsumoEmitido: consumo
        };
      } else {
        return {
          ...dispositivo,
          consumo
        };
      }
    });
    
    // Actualizar consumos para dispositivos por habitación, con menor variación
    Object.keys(cache.dispositvosPorHabitacion).forEach((habitacionIdStr: string) => {
      const habitacionId = parseInt(habitacionIdStr);
      let dispositivosHabitacionCambiados = false;
      
      cache.dispositvosPorHabitacion[habitacionId] = cache.dispositvosPorHabitacion[habitacionId].map((dispositivo: DispositivoConConsumo) => {
        // Buscar el dispositivo actualizado en la caché global
        const dispositivoActualizado = cache.dispositivos.find(d => d.id === dispositivo.id);
        
        // Si existe, usar ese valor, de lo contrario generar uno nuevo
        if (dispositivoActualizado) {
          // Comprobar si hay cambio significativo en el dispositivo
          const cambioSignificativo = superaUmbralCambio(
            dispositivo.ultimoConsumoEmitido || 0,
            dispositivoActualizado.consumo
          );
          
          if (cambioSignificativo) {
            dispositivosHabitacionCambiados = true;
          }
          
          return dispositivoActualizado;
        }
        
        // Generar variación menor: ±3% sobre el consumo actual
        let consumo = dispositivo.consumo;
        const variacion = consumo * 0.03 * (Math.random() > 0.5 ? 1 : -1);
        consumo = Math.round(consumo + variacion);
        
        // Asegurar consumo mínimo de 5W
        if (consumo < 5) {
          consumo = 5;
        }
        
        // Comprobar si el cambio es significativo
        const cambioSignificativo = superaUmbralCambio(
          dispositivo.ultimoConsumoEmitido || 0,
          consumo
        );
        
        // Si hay cambio significativo, actualizar el valor emitido y marcar
        if (cambioSignificativo) {
          dispositivosHabitacionCambiados = true;
          return {
            ...dispositivo,
            consumo,
            ultimoConsumoEmitido: consumo
          };
        } else {
          return {
            ...dispositivo,
            consumo
          };
        }
      });
      
      // Si hubo cambios significativos en esta habitación, añadir a la lista
      if (dispositivosHabitacionCambiados) {
        habitacionesCambiadasIds.push(habitacionId);
      }
    });
    
    // Recalcular consumos para habitaciones basados en sus dispositivos
    const habitacionesActualizadas: HabitacionConConsumo[] = [];
    
    for (const habitacion of cache.habitaciones) {
      // Filtrar dispositivos que pertenecen a esta habitación
      const dispositivosHabitacion = cache.dispositivos.filter(
        (dispositivo: DispositivoConConsumo) => dispositivo.habitacion_id === habitacion.id
      );
      
      // Calcular la suma de consumos de los dispositivos
      const consumoTotal = dispositivosHabitacion.reduce(
        (suma: number, dispositivo: DispositivoConConsumo) => suma + (dispositivo.consumo || 0), 
        0
      );
      
      // Comprobar si el cambio en el consumo total de la habitación es significativo
      const cambioSignificativo = superaUmbralCambio(
        habitacion.ultimoConsumoEmitido || 0,
        consumoTotal
      );
      
      if (cambioSignificativo) {
        habitacionesCambiadas = true;
        
        // Añadir habitación actualizada con nuevo valor emitido
        habitacionesActualizadas.push({
          ...habitacion,
          consumo: consumoTotal,
          ultimoConsumoEmitido: consumoTotal
        });
      } else {
        // Mantener el último valor emitido
        habitacionesActualizadas.push({
          ...habitacion,
          consumo: consumoTotal
        });
      }
    }
    
    // Actualizar cache de habitaciones
    cache.habitaciones = habitacionesActualizadas;
    
    // Calcular nuevo consumo total del sistema
    const nuevoConsumoTotal = cache.dispositivos.reduce(
      (suma: number, dispositivo: DispositivoConConsumo) => suma + dispositivo.consumo, 
      0
    );
    
    // Comprobar si el cambio en el consumo total es significativo
    consumoTotalCambiado = superaUmbralCambio(
      cache.ultimoConsumoTotalEmitido,
      nuevoConsumoTotal
    );
    
    // Actualizar consumo total
    cache.consumoTotal = nuevoConsumoTotal;
    if (consumoTotalCambiado) {
      cache.ultimoConsumoTotalEmitido = nuevoConsumoTotal;
    }
    
    // Actualizar top 10
    actualizarTop10();
    
    // Emitir eventos solo si hubo cambios significativos y control de tiempo
    if (dispositivosCambiados) {
      emitirEventoControlado(EVENTOS.DISPOSITIVOS_ACTUALIZADOS);
    }
    
    if (habitacionesCambiadas) {
      emitirEventoControlado(EVENTOS.HABITACIONES_ACTUALIZADAS);
    }
    
    if (consumoTotalCambiado) {
      emitirEventoControlado(EVENTOS.CONSUMO_TOTAL_ACTUALIZADO);
    }
    
    // Notificar cambios para habitaciones específicas
    habitacionesCambiadasIds.forEach(id => {
      emitirEventoControlado(EVENTOS.DISPOSITIVOS_HABITACION_ACTUALIZADOS, id);
    });
  } finally {
    // Asegurar que siempre se limpia el flag
    cache.emisionsEnCurso = false;
  }
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
      // Inicializar el último consumo total emitido
      cache.ultimoConsumoTotalEmitido = cache.consumoTotal;
      
      // Inicializar tiempos de emisión
      const ahora = Date.now();
      ultimasEmisiones.dispositivos = ahora;
      ultimasEmisiones.habitaciones = ahora;
      ultimasEmisiones.consumoTotal = ahora;
      
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
  return consumo >= 0 ? '#2391FF' : '#00ff00'; // Azul claro para consumo, verde para generación
};
