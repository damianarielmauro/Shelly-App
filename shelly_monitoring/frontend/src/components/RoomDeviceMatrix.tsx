import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import { updateOrdenDispositivos } from '../services/api';
import DraggableDeviceGrid from './DraggableDeviceGrid';
import { eventBus } from '../services/EventBus';
import { DeviceStateService, Dispositivo } from '../services/DeviceStateService';

// Importamos componentes y estilos compartidos
import DeviceCard from './shared/DeviceCard';
import { globalStyles, CARD_MARGIN } from '../styles/deviceStyles';

interface RoomDeviceMatrixProps {
  habitacionId: number;
  editMode: boolean;
}

const RoomDeviceMatrix: React.FC<RoomDeviceMatrixProps> = ({ 
  habitacionId, 
  editMode 
}) => {
  // Usar ref para tracking de montaje del componente
  const isMounted = useRef(true);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDevices, setLoadingDevices] = useState<{[key: number]: boolean}>({});
  const [instanceId] = useState(() => `room_${habitacionId}_${Date.now()}`); // ID única para esta instancia
  
  // Función para cargar dispositivos a través del nuevo DeviceStateService
  const cargarDispositivos = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      console.log(`[${instanceId}] Cargando dispositivos para habitación ${habitacionId}`);
      
      // Usar directamente el servicio para obtener dispositivos por habitación
      const devices = await DeviceStateService.getDevicesByRoom(habitacionId);
      
      // Actualizar estado directamente
      if (isMounted.current) {
        console.log(`[${instanceId}] Recibidos ${devices.length} dispositivos`);
        setDispositivos(devices);
        setLoading(false);
      }
    } catch (error) {
      console.error(`[${instanceId}] Error al obtener dispositivos:`, error);
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [habitacionId, instanceId]);

  // Efecto para inicializar
  useEffect(() => {
    console.log(`[${instanceId}] Inicializando matriz de habitación ${habitacionId}`);
    isMounted.current = true;
    
    // Suscribirse a eventos de carga de dispositivos
    const unsubDevicesLoaded = eventBus.on('devices:loaded', (devices) => {
      if (!isMounted.current) return;
      
      // Filtrar dispositivos de esta habitación
      const roomDevices = devices.filter((d: Dispositivo) => d.habitacion_id === habitacionId);
      
      if (roomDevices.length > 0) {
        console.log(`[${instanceId}] Actualizando desde evento devices:loaded: ${roomDevices.length} dispositivos`);
        setDispositivos(roomDevices);
        setLoading(false);
      }
    });
    
    // Suscribirse a cambios de estado individuales - NUEVO EVENTO: device:state-changed
    const unsubStateChanged = eventBus.on('device:state-changed', (deviceId, newState, source, metadata) => {
      if (!isMounted.current) return;
      
      // Actualizar solo si el dispositivo pertenece a esta habitación
      setDispositivos(prev => {
        const deviceIndex = prev.findIndex((d: Dispositivo) => d.id === deviceId);
        if (deviceIndex === -1) return prev; // Este dispositivo no está en esta habitación
        
        console.log(`[${instanceId}] Dispositivo ${deviceId} cambió a estado ${newState} (fuente: ${source})`);
        
        const updatedDevices = [...prev];
        updatedDevices[deviceIndex] = {
          ...updatedDevices[deviceIndex],
          estado: newState,
          online: true
        };
        
        // Si hay datos de consumo actualizados
        if (metadata?.consumo !== undefined) {
          updatedDevices[deviceIndex].consumo = metadata.consumo;
        }
        
        return updatedDevices;
      });
    });
    
    // Suscribirse a actualizaciones de consumo
    const unsubConsumoUpdated = eventBus.on('device:consumo-updated', (deviceId, consumo) => {
      if (!isMounted.current) return;
      
      setDispositivos(prev => {
        const deviceIndex = prev.findIndex((d: Dispositivo) => d.id === deviceId);
        if (deviceIndex === -1) return prev;
        
        const updatedDevices = [...prev];
        updatedDevices[deviceIndex] = {
          ...updatedDevices[deviceIndex],
          consumo
        };
        
        return updatedDevices;
      });
    });
    
    // Suscribirse a inicio/fin de operaciones para mostrar indicadores de carga
    const unsubOpStarted = eventBus.on('operation:started', (deviceId, operation) => {
      if (!isMounted.current) return;
      
      setDispositivos(prev => {
        // Verificar si este dispositivo pertenece a esta habitación
        const deviceExists = prev.some((d: Dispositivo) => d.id === deviceId);
        if (!deviceExists) return prev;
        
        if (operation === 'toggle') {
          console.log(`[${instanceId}] Iniciando operación ${operation} para dispositivo ${deviceId}`);
          setLoadingDevices(prevLoad => ({ ...prevLoad, [deviceId]: true }));
        }
        return prev;
      });
    });
    
    const unsubOpEnded = eventBus.on('operation:ended', (deviceId, operation) => {
      if (!isMounted.current) return;
      
      setDispositivos(prev => {
        // Verificar si este dispositivo pertenece a esta habitación
        const deviceExists = prev.some((d: Dispositivo) => d.id === deviceId);
        if (!deviceExists) return prev;
        
        if (operation === 'toggle') {
          console.log(`[${instanceId}] Finalizando operación ${operation} para dispositivo ${deviceId}`);
          // Usar timeout para dar tiempo a la UI para actualizarse
          setTimeout(() => {
            if (isMounted.current) {
              setLoadingDevices(prevLoad => ({ ...prevLoad, [deviceId]: false }));
            }
          }, 300);
        }
        return prev;
      });
    });
    
    // Suscribirse a cambios de estado online/offline de dispositivos
    const unsubOnlineStatus = eventBus.on('device:online-status-changed', (deviceId, isOnline) => {
      if (!isMounted.current) return;
      
      setDispositivos(prev => {
        const deviceIndex = prev.findIndex((d: Dispositivo) => d.id === deviceId);
        if (deviceIndex === -1) return prev;
        
        console.log(`[${instanceId}] Dispositivo ${deviceId} ahora está ${isOnline ? 'online' : 'offline'}`);
        
        const updatedDevices = [...prev];
        updatedDevices[deviceIndex] = {
          ...updatedDevices[deviceIndex],
          online: isOnline
        };
        
        return updatedDevices;
      });
    });
    
    // Cargar datos iniciales
    cargarDispositivos();

    // Limpiar al desmontar
    return () => {
      console.log(`[${instanceId}] Limpieza y desmontaje`);
      isMounted.current = false;
      unsubDevicesLoaded();
      unsubStateChanged();
      unsubConsumoUpdated();
      unsubOpStarted();
      unsubOpEnded();
      unsubOnlineStatus();
      setLoadingDevices({});
    };
  // CORRECCIÓN: Remover 'dispositivos' de las dependencias para evitar el ciclo infinito
  }, [habitacionId, editMode, cargarDispositivos, instanceId]);

  // Manejar reordenamiento
  const handleReorderDevices = async (newOrder: Dispositivo[]) => {
    if (!isMounted.current) return;
    
    try {
      const ordenData = newOrder.map((disp: Dispositivo, index: number) => ({
        id: disp.id,
        orden: index
      }));
      
      await updateOrdenDispositivos(ordenData);
      
      if (!isMounted.current) return;
      
      // Preservar estado actual
      const newOrderWithStatus = newOrder.map((device: Dispositivo) => {
        const existingDevice = dispositivos.find((d: Dispositivo) => d.id === device.id);
        return {
          ...device,
          online: existingDevice ? existingDevice.online : true,
          estado: existingDevice ? existingDevice.estado : device.estado
        };
      });
      
      setDispositivos(newOrderWithStatus);
    } catch (error) {
      console.error(`[${instanceId}] Error reordering devices:`, error);
      if (isMounted.current) cargarDispositivos();
    }
  };

  // Actualizado para usar el servicio de device-state directamente

// Asegúrate de que este import existe en la parte superior del archivo:
// import DeviceCard from './shared/DeviceCard';

const handleToggleDevice = useCallback((deviceId: number) => {
  if (!isMounted.current) return;
  
  // Evitar doble click mientras está cargando
  if (loadingDevices[deviceId]) {
    console.log(`[${instanceId}] Ignorando click en dispositivo ${deviceId}, ya está cargando`);
    return;
  }
  
  console.log(`[${instanceId}] Enviando toggle para dispositivo ${deviceId}`);
  
  // IMPORTANTE: Activar indicador de carga INMEDIATAMENTE para feedback visual
  setLoadingDevices(prev => ({ ...prev, [deviceId]: true }));
  
  // Llamar al servicio sin esperar la promesa para evitar congelación de UI
  DeviceStateService.toggleDevice(deviceId)
    .catch(error => {
      console.error(`[${instanceId}] Error toggling device ${deviceId}:`, error);
    })
    .finally(() => {
      // Aseguramos que el indicador de carga se desactive después de un tiempo
      setTimeout(() => {
        if (isMounted.current) {
          setLoadingDevices(prev => ({ ...prev, [deviceId]: false }));
        }
      }, 500);
    });
  
}, [instanceId, loadingDevices]);


  // Si estamos en modo edición
  if (editMode) {
    return (
      <Box
        sx={{
          overflowY: 'auto',
          height: 'calc(100vh - 85px)',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'black',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#2391FF',
          },
        }}
      >
        <DraggableDeviceGrid
          dispositivos={dispositivos}
          editMode={editMode}
          onReorder={handleReorderDevices}
        />
      </Box>
    );
  }

  // Vista normal
  return (
    <>
      <style>{globalStyles}</style>
      <Box
        data-instance-id={instanceId} // Útil para debug
        display="flex"
        flexDirection="column"
        sx={{
          overflowY: 'auto',
          height: 'calc(100vh - 85px)',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'black',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#2391FF',
          },
        }}
      >
        <Box
          display="flex"
          flexWrap="wrap"
          sx={{ paddingLeft: CARD_MARGIN }}
        >
          {dispositivos.map((dispositivo: Dispositivo) => {
            // Clave única para este dispositivo en esta instancia específica
            const deviceKey = `${instanceId}_device_${dispositivo.id}`;
            return (
              <DeviceCard
                key={deviceKey}
                dispositivo={dispositivo}
                onToggleDevice={handleToggleDevice}
                loadingDevices={loadingDevices}
              />
            );
          })}
        </Box>
      </Box>
    </>
  );
};

// Evitar remontajes innecesarios
export default React.memo(RoomDeviceMatrix);
