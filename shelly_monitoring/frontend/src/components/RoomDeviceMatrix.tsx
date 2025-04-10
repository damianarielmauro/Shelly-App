import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Box, Typography, Button, Menu, MenuItem, Popover, List,
  ListItemText, ListItemButton, Checkbox as FilterCheckbox, TextField, InputAdornment 
} from '@mui/material';
import { updateOrdenDispositivos } from '../services/api';
import DraggableDeviceGrid from './DraggableDeviceGrid';
import { eventBus } from '../services/EventBus';
import { DeviceStateService, Dispositivo } from '../services/DeviceStateService';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';

// Importamos componentes y estilos compartidos
import DeviceCard from './shared/DeviceCard';
import { globalStyles, CARD_MARGIN, TOTAL_CARD_WIDTH } from '../styles/deviceStyles';

// Importamos funciones de consumo
import { 
  formatearConsumo, 
  getColorForConsumo, 
  iniciarActualizacionPeriodica,
  obtenerDispositivosHabitacionConConsumo,
  suscribirseADispositivosHabitacionActualizados
} from '../services/consumptionService';

// Definimos los tipos de ordenación - EXCLUIMOS 'habitacion' para esta vista
type SortCriterion = 'consumo-mayor' | 'consumo-menor' | 'estado' | 'modelo' | 'nombre';
type FilterType = 'modelo' | 'online' | 'offline';

// Definimos el orden personalizado para los modelos
const modeloPrioridad: {[key: string]: number} = {
  'DIMMER2': 1,
  'PLUS2PM': 2,
  'PLUS1': 3,
  'PLUS1PM': 4,
  'EM': 5,
  'EM3': 6,
  'PRO1PM': 7,
  'PROEM50': 8
};

interface RoomDeviceMatrixProps {
  habitacionId: number;
  editMode: boolean;
  // Propiedades para renombrar y eliminar dispositivos
  onRenameDispositivo?: (id: number, newName: string) => Promise<void>;
  onDeleteDispositivo?: (id: number, type: string) => void;
}

const RoomDeviceMatrix: React.FC<RoomDeviceMatrixProps> = ({ 
  habitacionId, 
  editMode,
  onRenameDispositivo,
  onDeleteDispositivo
}) => {
  // Usar ref para tracking de montaje del componente
  const isMounted = useRef(true);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [dispositivosFiltrados, setDispositivosFiltrados] = useState<Dispositivo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDevices, setLoadingDevices] = useState<{[key: number]: boolean}>({});
  const [instanceId] = useState(() => `room_${habitacionId}_${Date.now()}`); // ID única para esta instancia
  
  // MODIFICADO: Cambiamos el criterio de ordenación predeterminado a 'modelo'
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>('modelo');
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [filterMenuType, setFilterMenuType] = useState<FilterType | null>(null);
  const [searchText, setSearchText] = useState("");
  
  // Estados para los filtros
  const [filtroModelos, setFiltroModelos] = useState<string[]>([]);
  const [filtroOnline, setFiltroOnline] = useState<boolean>(false);
  const [filtroOffline, setFiltroOffline] = useState<boolean>(false);
  
  // Lista de modelos para filtrar
  const [todosModelos, setTodosModelos] = useState<string[]>([]);
  
  // Función para cargar dispositivos a través del DeviceStateService y consumptionService
  const cargarDispositivos = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      console.log(`[${instanceId}] Cargando dispositivos para habitación ${habitacionId}`);
      
      // Utilizar obtenerDispositivosHabitacionConConsumo para obtener datos con consumo
      const devicesWithConsumption = await obtenerDispositivosHabitacionConConsumo(habitacionId, true);
      const devices = await DeviceStateService.getDevicesByRoom(habitacionId);
      
      // Combinar datos para asegurar que tenemos los datos actualizados y los de consumo
      const mergedDevices = devices.map(device => {
        const consumptionData = devicesWithConsumption.find(d => d.id === device.id);
        return {
          ...device,
          consumo: consumptionData?.consumo || device.consumo || 0,
        };
      });
      
      // Extraer modelos para filtros
      const tiposSet = new Set<string>();
      mergedDevices.forEach((d: Dispositivo) => {
        if (d.tipo) tiposSet.add(d.tipo);
      });
      
      // Ordenar modelos según el orden personalizado
      const modelos: string[] = Array.from(tiposSet);
      modelos.sort((a, b) => {
        const prioridadA = modeloPrioridad[a] || 999;
        const prioridadB = modeloPrioridad[b] || 999;
        return prioridadA - prioridadB;
      });
      
      setTodosModelos(modelos);
      
      // Actualizar estado directamente
      if (isMounted.current) {
        console.log(`[${instanceId}] Recibidos ${mergedDevices.length} dispositivos`);
        setDispositivos(mergedDevices);
        setDispositivosFiltrados(mergedDevices); // Inicialmente sin filtros
        setLoading(false);
      }
    } catch (error) {
      console.error(`[${instanceId}] Error al obtener dispositivos:`, error);
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [habitacionId, instanceId]);

  // Función para ordenar dispositivos - MODIFICADA para usar prioridad personalizada de modelos
  const ordenarDispositivos = useCallback((dispositivos: Dispositivo[], criterio: SortCriterion) => {
    const dispositivosOrdenados = [...dispositivos];
    
    switch (criterio) {
      case 'consumo-mayor':
        return dispositivosOrdenados.sort((a, b) => (b.consumo || 0) - (a.consumo || 0));
        
      case 'consumo-menor':
        return dispositivosOrdenados.sort((a, b) => (a.consumo || 0) - (b.consumo || 0));
        
      case 'estado':
        return dispositivosOrdenados.sort((a, b) => {
          // Comparar primero por estado (apagados primero, encendidos después)
          if (a.estado !== b.estado) {
            return a.estado ? 1 : -1; // Si a está encendido y b apagado, a va después
          }
          // Si tienen el mismo estado, ordenar por nombre
          return a.nombre.localeCompare(b.nombre);
        });
        
      case 'modelo':
        // MODIFICADO: Usar el orden personalizado definido en modeloPrioridad
        return dispositivosOrdenados.sort((a, b) => {
          const tipoA = a.tipo || '';
          const tipoB = b.tipo || '';
          const prioridadA = modeloPrioridad[tipoA] || 999; // Si no está en la lista, va al final
          const prioridadB = modeloPrioridad[tipoB] || 999;
          
          // Primero ordenar por prioridad, si son iguales ordenar por nombre
          if (prioridadA !== prioridadB) {
            return prioridadA - prioridadB;
          }
          
          return a.nombre.localeCompare(b.nombre);
        });
        
      case 'nombre':
        return dispositivosOrdenados.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
      default:
        return dispositivosOrdenados;
    }
  }, []);
  
  // Aplicar filtros
  const aplicarFiltros = useCallback((dispositivos: Dispositivo[]) => {
    // Performance: Evitar trabajo innecesario si no hay dispositivos
    if (!dispositivos.length) return [];
    
    let dispositivosFiltrados = [...dispositivos];
    
    // Ordenar primero
    dispositivosFiltrados = ordenarDispositivos(dispositivosFiltrados, sortCriterion);
    
    // Filtrar por modelo
    if (filtroModelos.length > 0) {
      dispositivosFiltrados = dispositivosFiltrados.filter(d => 
        d.tipo && filtroModelos.includes(d.tipo)
      );
    }
    
    // Filtrar por online/offline
    if (filtroOnline && !filtroOffline) {
      dispositivosFiltrados = dispositivosFiltrados.filter(d => d.online);
    } else if (!filtroOnline && filtroOffline) {
      dispositivosFiltrados = dispositivosFiltrados.filter(d => !d.online);
    }
    
    // Filtrar por texto de búsqueda
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      dispositivosFiltrados = dispositivosFiltrados.filter(d => 
        d.nombre.toLowerCase().includes(searchLower) ||
        (d.tipo && d.tipo.toLowerCase().includes(searchLower))
      );
    }
    
    return dispositivosFiltrados;
  }, [filtroModelos, filtroOnline, filtroOffline, searchText, sortCriterion, ordenarDispositivos]);

  // Efecto para inicializar
  useEffect(() => {
    console.log(`[${instanceId}] Inicializando matriz de habitación ${habitacionId}`);
    isMounted.current = true;
    
    // Iniciar servicio de actualización periódica de consumo
    iniciarActualizacionPeriodica();
    
    // Suscribirse a actualizaciones de dispositivos de la habitación con datos de consumo
    const unsubConsumptionUpdates = suscribirseADispositivosHabitacionActualizados(
      habitacionId,
      () => {
        if (isMounted.current) {
          cargarDispositivos();
        }
      }
    );
    
    // Suscribirse a eventos de carga de dispositivos
    const unsubDevicesLoaded = eventBus.on('devices:loaded', (devices) => {
      if (!isMounted.current) return;
      
      // Filtrar dispositivos de esta habitación
      const roomDevices = devices.filter((d: Dispositivo) => d.habitacion_id === habitacionId);
      
      if (roomDevices.length > 0) {
        console.log(`[${instanceId}] Actualizando desde evento devices:loaded: ${roomDevices.length} dispositivos`);
        setDispositivos(roomDevices);
        
        // Extraer modelos para filtros
        const tiposSet = new Set<string>();
        roomDevices.forEach((d: Dispositivo) => {
          if (d.tipo) tiposSet.add(d.tipo);
        });
        
        // Ordenar modelos según el orden personalizado
        const modelos: string[] = Array.from(tiposSet);
        modelos.sort((a, b) => {
          const prioridadA = modeloPrioridad[a] || 999;
          const prioridadB = modeloPrioridad[b] || 999;
          return prioridadA - prioridadB;
        });
        
        setTodosModelos(modelos);
        
        setLoading(false);
      }
    });
    
    // Suscribirse a cambios de estado individuales
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
      unsubConsumptionUpdates(); // Dar de baja la suscripción a datos de consumo
      setLoadingDevices({});
    };
  }, [habitacionId, editMode, cargarDispositivos, instanceId]);

  // Aplicar filtros cuando cambien los criterios o los dispositivos
  useEffect(() => {
    const filtrados = aplicarFiltros(dispositivos);
    setDispositivosFiltrados(filtrados);
  }, [dispositivos, aplicarFiltros]);

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
          estado: existingDevice ? existingDevice.estado : device.estado,
          consumo: existingDevice ? existingDevice.consumo : 0 // Preservar el consumo
        };
      });
      
      setDispositivos(newOrderWithStatus);
    } catch (error) {
      console.error(`[${instanceId}] Error reordering devices:`, error);
      if (isMounted.current) cargarDispositivos();
    }
  };

  // Manejadores de eventos para ordenación y filtrado
  const handleSortClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  }, []);
  
  const handleSortClose = useCallback(() => {
    setSortAnchorEl(null);
  }, []);
  
  const handleSortSelect = useCallback((criterion: SortCriterion) => {
    setSortCriterion(criterion);
    handleSortClose();
  }, [handleSortClose]);
  
  const handleFilterClick = useCallback((event: React.MouseEvent<HTMLElement>, type: FilterType) => {
    setFilterAnchorEl(event.currentTarget);
    setFilterMenuType(type);
  }, []);
  
  const handleFilterClose = useCallback(() => {
    setFilterAnchorEl(null);
    setFilterMenuType(null);
  }, []);
  
  // Manejadores para modelos
  const handleSelectAllModelos = useCallback(() => {
    setFiltroModelos([...todosModelos]);
  }, [todosModelos]);
  
  const handleDeselectAllModelos = useCallback(() => {
    setFiltroModelos([]);
  }, []);
  
  const handleToggleModeloFilter = useCallback((modelo: string) => {
    setFiltroModelos(prev => {
      if (prev.includes(modelo)) {
        return prev.filter(m => m !== modelo);
      } else {
        return [...prev, modelo];
      }
    });
  }, []);
  
  const handleToggleOnlineFilter = useCallback(() => {
    setFiltroOnline(!filtroOnline);
  }, [filtroOnline]);
  
  const handleToggleOfflineFilter = useCallback(() => {
    setFiltroOffline(!filtroOffline);
  }, [filtroOffline]);
  
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  }, []);

  // Toggle dispositivos
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
          width: '100%', // CORRECCIÓN: Garantizar ancho completo
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
          onRename={onRenameDispositivo}
          onDelete={onDeleteDispositivo}
        />
      </Box>
    );
  }

  // Vista normal - Con controles de ordenación y filtrado
  return (
    <>
      <style>{globalStyles}</style>
      <Box
        data-instance-id={instanceId} // Útil para debug
        display="flex"
        flexDirection="column"
        sx={{
          height: 'calc(100vh - 85px)',
          position: 'relative',
          width: '100%', // CORRECCIÓN: Garantizar ancho completo
        }}
      >
        {/* Fila para los controles de ordenación, filtrado y búsqueda */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            mb: 2,
            px: 2,
            height: '48px',
            width: '100%', // CORRECCIÓN: Garantizar ancho completo
            backgroundColor: '#272727',
            borderRadius: '4px',
          }}
        >
          <Box display="flex" alignItems="center">
            {/* Menú de ordenación */}
            <Button 
              startIcon={<SortIcon />}
              onClick={handleSortClick}
              sx={{ 
                color: '#2391FF',
                textTransform: 'none',
                fontSize: '0.85rem',
                mr: 2
              }}
            >
              Ordenar
            </Button>
            <Menu
              anchorEl={sortAnchorEl}
              open={Boolean(sortAnchorEl)}
              onClose={handleSortClose}
              PaperProps={{
                style: {
                  backgroundColor: '#272727',
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  borderRadius: '8px'
                }
              }}
            >
              <MenuItem 
                onClick={() => handleSortSelect('modelo')} 
                selected={sortCriterion === 'modelo'}
                sx={{ 
                  fontSize: '0.85rem',
                  padding: '4px 16px',
                  '&.Mui-selected': { 
                    backgroundColor: 'rgba(35, 145, 255, 0.1)', 
                    color: '#2391FF'
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(35, 145, 255, 0.05)'
                  }
                }}
              >
                Por Modelo
              </MenuItem>
              <MenuItem 
                onClick={() => handleSortSelect('consumo-mayor')} 
                selected={sortCriterion === 'consumo-mayor'}
                sx={{ 
                  fontSize: '0.85rem',
                  padding: '4px 16px',
                  '&.Mui-selected': { 
                    backgroundColor: 'rgba(35, 145, 255, 0.1)', 
                    color: '#2391FF'
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(35, 145, 255, 0.05)'
                  }
                }}
              >
                Mayor Consumo
              </MenuItem>
              <MenuItem 
                onClick={() => handleSortSelect('consumo-menor')} 
                selected={sortCriterion === 'consumo-menor'}
                sx={{ 
                  fontSize: '0.85rem',
                  padding: '4px 16px',
                  '&.Mui-selected': { 
                    backgroundColor: 'rgba(35, 145, 255, 0.1)', 
                    color: '#2391FF'
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(35, 145, 255, 0.05)'
                  }
                }}
              >
                Menor Consumo
              </MenuItem>
              <MenuItem 
                onClick={() => handleSortSelect('estado')} 
                selected={sortCriterion === 'estado'}
                sx={{ 
                  fontSize: '0.85rem',
                  padding: '4px 16px',
                  '&.Mui-selected': { 
                    backgroundColor: 'rgba(35, 145, 255, 0.1)', 
                    color: '#2391FF'
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(35, 145, 255, 0.05)'
                  }
                }}
              >
                Por Estado
              </MenuItem>
              <MenuItem 
                onClick={() => handleSortSelect('nombre')} 
                selected={sortCriterion === 'nombre'}
                sx={{ 
                  fontSize: '0.85rem',
                  padding: '4px 16px',
                  '&.Mui-selected': { 
                    backgroundColor: 'rgba(35, 145, 255, 0.1)', 
                    color: '#2391FF'
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(35, 145, 255, 0.05)'
                  }
                }}
              >
                Por Nombre
              </MenuItem>
            </Menu>
            
            {/* Menús de filtrado - Solo modelo para esta vista */}
            <Button 
              startIcon={<FilterListIcon />}
              onClick={(e) => handleFilterClick(e, 'modelo')}
              sx={{ 
                color: filtroModelos.length > 0 ? '#2391FF' : 'white',
                fontWeight: filtroModelos.length > 0 ? 'bold' : 'normal',
                textTransform: 'none',
                fontSize: '0.85rem',
                mr: 2
              }}
            >
              Filtrar por Modelo
              {filtroModelos.length > 0 && ` (${filtroModelos.length})`}
            </Button>
            
            <Button 
              onClick={handleToggleOnlineFilter}
              sx={{ 
                color: filtroOnline ? '#2391FF' : 'white',
                fontWeight: filtroOnline ? 'bold' : 'normal',
                textTransform: 'none',
                fontSize: '0.85rem',
                mr: 1
              }}
            >
              Online
            </Button>
            
            <Button 
              onClick={handleToggleOfflineFilter}
              sx={{ 
                color: filtroOffline ? '#2391FF' : 'white',
                fontWeight: filtroOffline ? 'bold' : 'normal',
                textTransform: 'none',
                fontSize: '0.85rem'
              }}
            >
              Offline
            </Button>
          </Box>
          
          {/* Campo de búsqueda */}
          <TextField
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Buscar dispositivo..."
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                </InputAdornment>
              ),
              sx: {
                color: 'white',
                borderColor: '#555',
                borderRadius: '20px',
                fontSize: '0.85rem',
                height: '36px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#555',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#777',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2391FF',
                },
              }
            }}
            sx={{
              width: '250px',
              '& .MuiInputBase-root': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                height: '36px',
              }
            }}
          />
        </Box>
        
        {/* Contador de dispositivos filtrados */}
        {dispositivosFiltrados.length !== dispositivos.length && (
          <Box
            display="flex"
            justifyContent="flex-end"
            sx={{ 
              mb: 2, 
              pr: 4,
              width: '100%' // CORRECCIÓN: Garantizar ancho completo
            }}
          >
            <Typography variant="body1" sx={{ color: 'orange' }}>
              Filtrados: {dispositivosFiltrados.length} / {dispositivos.length}
            </Typography>
          </Box>
        )}
        
        {/* Área de contenido - CONTENEDOR PRINCIPAL */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            width: '100%', // CORRECCIÓN: Garantizar ancho completo
            minWidth: '100%', // CORRECCIÓN: Forzar ancho mínimo completo
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
          {/* Popover para filtro por modelo */}
          <Popover
            open={Boolean(filterAnchorEl) && filterMenuType === 'modelo'}
            anchorEl={filterAnchorEl}
            onClose={handleFilterClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            PaperProps={{
              style: {
                backgroundColor: '#272727',
                color: 'white',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                borderRadius: '8px',
                maxHeight: '300px',
                overflow: 'auto'
              }
            }}
          >
            {/* Botones Seleccionar Todo / Ninguno */}
            <Box 
              display="flex" 
              justifyContent="space-between" 
              sx={{ 
                borderBottom: '1px solid #444',
                p: 1,
                px: 2
              }}
            >
              <Button
                startIcon={<CheckIcon fontSize="small" />}
                onClick={handleSelectAllModelos}
                size="small"
                sx={{ 
                  color: '#2391FF',
                  fontSize: '0.8rem',
                  textTransform: 'none'
                }}
              >
                Seleccionar todo
              </Button>
              <Button
                startIcon={<CloseIcon fontSize="small" />}
                onClick={handleDeselectAllModelos}
                size="small"
                sx={{ 
                  color: '#999',
                  fontSize: '0.8rem',
                  textTransform: 'none'
                }}
              >
                Ninguno
              </Button>
            </Box>
            
            <List sx={{ 
              width: '200px', 
              py: 0.5,
              '& .MuiListItemButton-root': {
                py: 0.2 // Reducir altura de los items
              }
            }}>
              {todosModelos.map((modelo) => (
                <ListItemButton key={modelo} onClick={() => handleToggleModeloFilter(modelo)}>
                  <FilterCheckbox 
                    checked={filtroModelos.includes(modelo)} 
                    size="small"
                    sx={{ 
                      color: 'white',
                      padding: '2px',
                      '&.Mui-checked': {
                        color: '#2391FF',
                      }
                    }} 
                  />
                  <ListItemText 
                    primary={modelo} 
                    primaryTypographyProps={{ 
                      fontSize: '0.85rem',
                      fontWeight: filtroModelos.includes(modelo) ? 'bold' : 'normal'
                    }} 
                  />
                </ListItemButton>
              ))}
            </List>
          </Popover>
        
          {/* Lista de dispositivos con los filtros aplicados */}
          <Box
            display="flex"
            flexWrap="wrap"
            sx={{ 
              paddingLeft: CARD_MARGIN,
              width: '100%', // CORRECCIÓN: Garantizar ancho completo
              minWidth: '100%', // CORRECCIÓN: Forzar ancho mínimo completo
              // CORRECCIÓN: Asegurar que el contenedor siempre ocupe todo el ancho disponible
              '&::after': {
                content: '""',
                flex: 'auto',
                minWidth: TOTAL_CARD_WIDTH
              }
            }}
          >
            {dispositivosFiltrados.map((dispositivo: Dispositivo) => {
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
            {/* CORRECCIÓN: Elementos invisibles para mantener el layout cuando hay pocos dispositivos */}
            {dispositivosFiltrados.length < 4 && Array.from({ length: 4 - dispositivosFiltrados.length }).map((_, i) => (
              <Box 
                key={`spacer-${i}`} 
                sx={{ 
                  width: TOTAL_CARD_WIDTH, 
                  height: 0,
                  margin: CARD_MARGIN,
                  visibility: 'hidden' 
                }} 
              />
            ))}
          </Box>
        </Box>
      </Box>
    </>
  );
};

// Evitar remontajes innecesarios
export default React.memo(RoomDeviceMatrix);
