/**
 * EventBus.ts
 * 
 * Sistema centralizado de eventos para la aplicación.
 * Permite la comunicación entre componentes sin acoplamiento directo.
 */

type EventHandler = (...args: any[]) => void;

class EventBus {
  private events: { [key: string]: EventHandler[] } = {};

  /**
   * Suscribirse a un evento
   * @param eventName Nombre del evento
   * @param handler Función manejadora
   * @returns Función para cancelar suscripción
   */
  on(eventName: string, handler: EventHandler): () => void {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    
    this.events[eventName].push(handler);
    console.log(`EventBus: Nueva suscripción a '${eventName}', total: ${this.events[eventName].length}`);
    
    return () => {
      this.off(eventName, handler);
    };
  }

  /**
   * Cancelar suscripción a un evento
   * @param eventName Nombre del evento
   * @param handler Función manejadora a eliminar
   */
  off(eventName: string, handler: EventHandler): void {
    if (!this.events[eventName]) return;
    
    const index = this.events[eventName].indexOf(handler);
    
    if (index !== -1) {
      this.events[eventName].splice(index, 1);
      console.log(`EventBus: Cancelada suscripción a '${eventName}', quedan: ${this.events[eventName].length}`);
      
      // Limpiar arrays vacíos
      if (this.events[eventName].length === 0) {
        delete this.events[eventName];
      }
    }
  }

  /**
   * Emitir un evento
   * @param eventName Nombre del evento a emitir
   * @param args Argumentos para pasar a los manejadores
   */
  emit(eventName: string, ...args: any[]): void {
    if (!this.events[eventName]) {
      // Registrar eventos que no tienen suscriptores para depuración
      if (!['debug:log', 'debug:warn', 'debug:error'].includes(eventName)) {
        console.log(`EventBus: Evento '${eventName}' emitido sin suscriptores`);
      }
      return;
    }
    
    // Hacemos una copia para evitar problemas si un manejador
    // subscribe/unsubscribe durante la ejecución
    const handlers = [...this.events[eventName]];
    
    handlers.forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`EventBus: Error en manejador para '${eventName}':`, error);
      }
    });
  }

  /**
   * Emitir un evento con verificación de suscriptores
   * @param eventName Nombre del evento a emitir
   * @param args Argumentos para pasar a los manejadores
   */
  safeEmit(eventName: string, ...args: any[]): void {
    if (!this.events[eventName] || this.events[eventName].length === 0) {
      console.warn(`EventBus: Emitiendo '${eventName}' sin suscriptores activos`);
    }
    
    this.emit(eventName, ...args);
  }

  /**
   * Emitir un evento una sola vez (elimina todos los listeners después)
   * @param eventName Nombre del evento a emitir
   * @param args Argumentos para pasar a los manejadores
   */
  once(eventName: string, handler: EventHandler): () => void {
    const onceHandler = (...args: any[]) => {
      handler(...args);
      this.off(eventName, onceHandler);
    };
    
    return this.on(eventName, onceHandler);
  }

  /**
   * Eliminar todas las suscripciones a un evento
   * @param eventName Nombre del evento
   */
  clear(eventName?: string): void {
    if (eventName) {
      delete this.events[eventName];
    } else {
      this.events = {};
    }
  }
  
  /**
   * Método para depuración que lista todas las suscripciones activas
   */
  debugSubscriptions(): { [key: string]: number } {
    const counts: { [key: string]: number } = {};
    
    Object.keys(this.events).forEach(eventName => {
      counts[eventName] = this.events[eventName].length;
    });
    
    console.table(counts);
    return counts;
  }

  /**
   * Método para verificar si un evento tiene suscriptores
   */
  hasSubscribers(eventName: string): boolean {
    return !!this.events[eventName]?.length;
  }
}

// Singleton - toda la app usará la misma instancia
export const eventBus = new EventBus();
