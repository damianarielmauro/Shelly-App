import React, { useEffect, useState, useCallback, memo, useMemo, useRef } from 'react';
import { 
  Box, Typography, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio,
  Menu, MenuItem, Popover, List,
  ListItemText, ListItemButton, Checkbox as FilterCheckbox, TextField, InputAdornment
} from '@mui/material';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import { getHabitaciones, asignarHabitacion } from '../services/api';

// Importar sistema de eventos y servicio
import { eventBus } from '../services/EventBus';
import { DeviceStateService, Dispositivo } from '../services/DeviceStateService';

// Importar servicios de consumo
import { 
  formatearConsumo, 
  getColorForConsumo, 
  iniciarActualizacionPeriodica,
  obtenerDispositivosConConsumo,
  suscribirseADispositivosActualizados,
  suscribirseAConsumoTotalActualizado
} from '../services/consumptionService';

// Importar componentes compartidos
import DeviceCard from './shared/DeviceCard';
import { globalStyles, CARD_MARGIN, TOTAL_CARD_WIDTH, TOTAL_CARD_HEIGHT } from '../styles/deviceStyles';

// Definimos los tipos de ordenación - AGREGAMOS 'estado' a los criterios
type SortCriterion = 'consumo-mayor' | 'consumo-menor' | 'habitacion' | 'modelo' | 'nombre' | 'estado';
type FilterType = 'habitacion' | 'modelo' | 'online' | 'offline';

// Componente para la matriz virtualizada con optimizaciones adicionales
const VirtualizedDeviceMatrix = memo(({ 
  dispositivosFiltrados,
  editMode,
  selectedItems,
  loadingDevices,
  onToggleDevice,
  onSelect
}: {
  dispositivosFiltrados: Dispositivo[];
  editMode: boolean;
  selectedItems: number[];
  loadingDevices: {[key: number]: boolean};
  onToggleDevice: (id: number) => void;
  onSelect: (id: number) => void;
}) => {
  // Usamos una clave que solo cambia cuando cambia la lista de IDs, no todo el array
  const gridKey = useMemo(() => {
    return dispositivosFiltrados.map(d => d.id).join(',');
  }, [dispositivosFiltrados]);

  // Hacemos el renderCell como función estable
  const renderCell = useCallback(({ columnIndex, rowIndex, style, data }: any) => {
    const index = rowIndex * data.columnCount + columnIndex;
    if (index >= data.items.length) {
      return null; // No renderizar si estamos fuera del rango
    }
    const dispositivo = data.items[index];
    return (
      <DeviceCard
        key={dispositivo.id}
        dispositivo={dispositivo}
        isEditing={data.editMode}
        isSelected={data.selectedItems.includes(dispositivo.id)}
        onToggleDevice={data.onToggleDevice}
        onSelect={data.onSelect}
        loadingDevices={data.loadingDevices}
        style={style}
      />
    );
  }, []);
  
  // Aseguramos que los datos para la grilla solo cambien cuando es necesario
  const itemData = useMemo(() => ({
    items: dispositivosFiltrados,
    columnCount: 0, // Se reemplazará en el renderizado
    editMode,
    selectedItems,
    loadingDevices,
    onToggleDevice,
    onSelect
  }), [dispositivosFiltrados, editMode, selectedItems, loadingDevices, onToggleDevice, onSelect]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <AutoSizer>
        {({ height, width }) => {
          // Calculamos cuántas tarjetas caben por fila
          const columnCount = Math.max(Math.floor(width / TOTAL_CARD_WIDTH), 1);
          // Calculamos cuántas filas necesitamos
          const rowCount = Math.ceil(dispositivosFiltrados.length / columnCount);
          
          // Añadir margen izquierdo igual al espacio entre tarjetas
          const leftMargin = CARD_MARGIN;
          
          return (
            <div style={{ paddingLeft: leftMargin }}>
              <Grid
                key={gridKey} // Usamos la clave para forzar recreación solo cuando cambia la lista
                columnCount={columnCount}
                columnWidth={TOTAL_CARD_WIDTH}
                height={height}
                rowCount={rowCount}
                rowHeight={TOTAL_CARD_HEIGHT}
                width={width - leftMargin} // Ajustar el ancho para compensar el padding
                style={{ overflowX: 'hidden' }}
                itemData={{
                  ...itemData,
                  columnCount
                }}
                overscanRowCount={2} // Renderizar más filas para scroll suave
                overscanColumnCount={2} // Renderizar más columnas para scroll horizontal
              >
                {renderCell}
              </Grid>
            </div>
          );
        }}
      </AutoSizer>
    </div>
  );
});

interface DeviceMatrixProps {
  user: {
    permissions: string[];
  };
  editMode: boolean;
  onSelectedItemsChange?: (devices: number[]) => void;
  showRoomDialog?: boolean;
  setShowRoomDialog?: React.Dispatch<React.SetStateAction<boolean>>;
}

const DeviceMatrix: React.FC<DeviceMatrixProps> = ({ 
  user, 
  editMode, 
  onSelectedItemsChange, 
  showRoomDialog = false, 
  setShowRoomDialog 
}) => {
  // Estados principales
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [dispositivosFiltrados, setDispositivosFiltrados] = useState<Dispositivo[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [selectedHabitacion, setSelectedHabitacion] = useState<string>("null");
  const [contadorAsignados, setContadorAsignados] = useState(0);
  const [contadorSinAsignar, setContadorSinAsignar] = useState(0);
  const [loadingDevices, setLoadingDevices] = useState<{[key: number]: boolean}>({});
  
  // Estados para ordenación y filtrado
  // CAMBIO 2: Cambiamos el criterio por defecto a 'consumo-mayor'
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>('consumo-mayor');
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [filterMenuType, setFilterMenuType] = useState<FilterType | null>(null);
  const [searchText, setSearchText] = useState("");
  
  // Estados para los filtros
  const [filtroHabitaciones, setFiltroHabitaciones] = useState<string[]>([]);
  const [filtroModelos, setFiltroModelos] = useState<string[]>([]);
  const [filtroOnline, setFiltroOnline] = useState<boolean>(false);
  const [filtroOffline, setFiltroOffline] = useState<boolean>(false);
  
  // Lista de habitaciones y modelos para filtrar
  const [todasHabitaciones, setTodasHabitaciones] = useState<{id: number, nombre: string}[]>([]);
  const [todosModelos, setTodosModelos] = useState<string[]>([]);

  // Usar ref para tracking de montaje del componente
  const isMounted = useRef(true);
  // ID única para esta instancia
  const [instanceId] = useState(() => `matrix_${Date.now()}`);

  // Efecto para suscribirse a eventos
  useEffect(() => {
    console.log(`[${instanceId}] DeviceMatrix: Inicializando suscripciones a eventos`);
    isMounted.current = true; // Marcar componente como montado
    
    // NUEVO: Iniciar servicio de actualización periódica
    iniciarActualizacionPeriodica();
    
    // Suscribirse a cambios de estado de dispositivos
    const unsubStateChanged = eventBus.on('device:state-changed', (deviceId, newState, source) => {
      if (!isMounted.current) return;
      
      console.log(`[${instanceId}] DeviceMatrix: Dispositivo ${deviceId} cambió a estado ${newState} (fuente: ${source})`);
      setDispositivos(prev => 
        prev.map(disp => disp.id === deviceId 
          ? { ...disp, estado: newState, online: true } 
          : disp
        )
      );
    });
    
    // Suscribirse a actualizaciones de consumo
    const unsubConsumoUpdated = eventBus.on('device:consumo-updated', (deviceId, consumo) => {
      if (!isMounted.current) return;
      
      setDispositivos(prev => 
        prev.map(disp => disp.id === deviceId 
          ? { ...disp, consumo } 
          : disp
        )
      );
    });
    
    // Suscribirse a cambios de estado online/offline
    const unsubOnlineStatus = eventBus.on('device:online-status-changed', (deviceId, isOnline) => {
      if (!isMounted.current) return;
      
      setDispositivos(prev => 
        prev.map(disp => disp.id === deviceId 
          ? { ...disp, online: isOnline } 
          : disp
        )
      );
    });
    
    // Suscribirse a inicio/fin de operaciones para mostrar indicadores de carga
    const unsubOpStarted = eventBus.on('operation:started', (deviceId, operation) => {
      if (!isMounted.current) return;
      
      if (operation === 'toggle') {
        console.log(`[${instanceId}] Iniciando operación ${operation} para dispositivo ${deviceId}`);
        setLoadingDevices(prev => ({ ...prev, [deviceId]: true }));
      }
    });
    
    const unsubOpEnded = eventBus.on('operation:ended', (deviceId, operation) => {
      if (!isMounted.current) return;
      
      if (operation === 'toggle') {
        console.log(`[${instanceId}] Finalizando operación ${operation} para dispositivo ${deviceId}`);
        // Usar timeout para dar tiempo a la UI para actualizarse
        setTimeout(() => {
          if (isMounted.current) {
            setLoadingDevices(prev => ({ ...prev, [deviceId]: false }));
          }
        }, 300);
      }
    });
    
    return () => {
      // Limpiar suscripciones al desmontar
      console.log(`[${instanceId}] DeviceMatrix: Limpiando suscripciones a eventos`);
      isMounted.current = false;
      unsubStateChanged();
      unsubConsumoUpdated();
      unsubOnlineStatus();
      unsubOpStarted();
      unsubOpEnded();
      setLoadingDevices({});
    };
  }, [instanceId]);

  // Optimizaciones con useCallback para funciones que no cambian con frecuencia
  const ordenarDispositivos = useCallback((dispositivos: Dispositivo[], criterio: SortCriterion) => {
    const dispositivosOrdenados = [...dispositivos];
    
    switch (criterio) {
      case 'consumo-mayor':
        return dispositivosOrdenados.sort((a, b) => (b.consumo || 0) - (a.consumo || 0));
        
      case 'consumo-menor':
        return dispositivosOrdenados.sort((a, b) => (a.consumo || 0) - (b.consumo || 0));
        
      case 'habitacion':
        return dispositivosOrdenados.sort((a, b) => {
          if (a.habitacion_id && !b.habitacion_id) return -1;
          if (!a.habitacion_id && b.habitacion_id) return 1;
          
          if (a.habitacion_id && b.habitacion_id) {
            const habitacionA = todasHabitaciones.find(h => h.id === a.habitacion_id)?.nombre || '';
            const habitacionB = todasHabitaciones.find(h => h.id === b.habitacion_id)?.nombre || '';
            return habitacionA.localeCompare(habitacionB);
          }
          
          return a.nombre.localeCompare(b.nombre);
        });
        
      case 'modelo':
        return dispositivosOrdenados.sort((a, b) => {
          const tipoA = a.tipo || '';
          const tipoB = b.tipo || '';
          return tipoA.localeCompare(tipoB);
        });
        
      case 'nombre':
        return dispositivosOrdenados.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      // CAMBIO 2: Añadir criterio 'estado' - Primero apagados, luego encendidos
      case 'estado':
        return dispositivosOrdenados.sort((a, b) => {
          // Comparar primero por estado (apagados primero, encendidos después)
          if (a.estado !== b.estado) {
            return a.estado ? 1 : -1; // Si a está encendido y b apagado, a va después
          }
          // Si tienen el mismo estado, ordenar por nombre
          return a.nombre.localeCompare(b.nombre);
        });
        
      default:
        return dispositivosOrdenados;
    }
  }, [todasHabitaciones]);
  
  const aplicarFiltros = useCallback((dispositivos: Dispositivo[]) => {
    // Performance: Evitar trabajo innecesario si no hay dispositivos
    if (!dispositivos.length) return [];
    
    let dispositivosFiltrados = [...dispositivos];
    
    // Ordenar primero
    dispositivosFiltrados = ordenarDispositivos(dispositivosFiltrados, sortCriterion);
    
    // Filtrar por habitación
    if (filtroHabitaciones.length > 0) {
      dispositivosFiltrados = dispositivosFiltrados.filter(d => {
        if (filtroHabitaciones.includes('sin-asignar') && !d.habitacion_id) {
          return true;
        }
        
        return d.habitacion_id !== undefined && 
               d.habitacion_id !== null &&
               filtroHabitaciones.includes(String(d.habitacion_id));
      });
    }
    
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
  }, [filtroHabitaciones, filtroModelos, filtroOnline, filtroOffline, searchText, sortCriterion, ordenarDispositivos]);

  // Efecto para obtener los dispositivos y configurar todo al inicio
  useEffect(() => {
    if (!isMounted.current) return;
    
    // NUEVO: Suscribirse a actualizaciones de dispositivos con datos de consumo
    const unsubConsumptionUpdates = suscribirseADispositivosActualizados(() => {
      if (isMounted.current) {
        fetchData();
      }
    });
    
    // Cargar dispositivos desde el nuevo servicio
    const fetchData = async () => {
      try {
        console.log(`[${instanceId}] DeviceMatrix: Cargando dispositivos desde servicio centralizado`);
        
        // Obtener habitaciones para filtros
        const habitacionesData = await getHabitaciones();
        if (!isMounted.current) return;
        
        // CAMBIO 1: Ordenar habitaciones alfabéticamente por nombre
        const sortedHabitaciones = [...habitacionesData].sort((a, b) => 
          a.nombre.localeCompare(b.nombre)
        );
        setTodasHabitaciones(sortedHabitaciones);
        
        // MODIFICADO: Usar obtenerDispositivosConConsumo para obtener datos actualizados de consumo
        const devicesWithConsumption = await obtenerDispositivosConConsumo();
        
        // También obtener dispositivos del DeviceStateService para estado online/offline
        const devices = await DeviceStateService.loadInitialDevices();
        
        // Combinar ambas fuentes de datos para tener la información más actualizada
        const mergedDevices = devices.map(device => {
          const consumptionData = devicesWithConsumption.find(d => d.id === device.id);
          return {
            ...device,
            consumo: consumptionData?.consumo || device.consumo || 0,
          };
        });
        
        // Extraer modelos para filtros
        const tiposSet = new Set<string>();
        mergedDevices.forEach(d => {
          if (d.tipo) tiposSet.add(d.tipo);
        });
        // CAMBIO 1: Ordenar modelos alfabéticamente
        const modelos: string[] = Array.from(tiposSet).sort();
        setTodosModelos(modelos);
        
        // CAMBIO 4: Marcar artificialmente 4 dispositivos como offline (2 asignados, 2 sin asignar)
        const devicesWithOffline = [...mergedDevices];
        
        // Buscar 2 dispositivos asignados y marcarlos como offline
        let countAsignados = 0;
        let countNoAsignados = 0;
        
        for (let i = 0; i < devicesWithOffline.length && (countAsignados < 2 || countNoAsignados < 2); i++) {
          if (devicesWithOffline[i].habitacion_id && countAsignados < 2) {
            devicesWithOffline[i].online = false;
            countAsignados++;
          } else if (!devicesWithOffline[i].habitacion_id && countNoAsignados < 2) {
            devicesWithOffline[i].online = false;
            countNoAsignados++;
          }
        }
        
        // Actualizar contadores y dispositivos
        setDispositivos(devicesWithOffline);
                
        setContadorAsignados(devicesWithOffline.filter((d: Dispositivo) => d.habitacion_id).length);
        setContadorSinAsignar(devicesWithOffline.filter((d: Dispositivo) => !d.habitacion_id).length);

      } catch (error) {
        console.error(`[${instanceId}] Error al obtener los dispositivos:`, error);
      }
    };

    // Cargar datos iniciales
    fetchData();

    // Suscribirse a eventos de carga de dispositivos
    const unsubDevicesLoaded = eventBus.on('devices:loaded', (devices) => {
      if (!isMounted.current) return;
      
      console.log(`[${instanceId}] DeviceMatrix: Actualizando desde evento devices:loaded global`);
      setDispositivos(devices);
      setContadorAsignados(devices.filter((d: Dispositivo) => d.habitacion_id).length);
      setContadorSinAsignar(devices.filter((d: Dispositivo) => !d.habitacion_id).length);
      
      // Extraer modelos para filtros
      const tiposSet = new Set<string>();
      devices.forEach((d: Dispositivo) => {
        if (d.tipo) tiposSet.add(d.tipo);
      });
      // CAMBIO 1: Ordenar modelos alfabéticamente
      const modelos: string[] = Array.from(tiposSet).sort();
      setTodosModelos(modelos);
    });

    // Limpiar suscripción al desmontar
    return () => {
      unsubDevicesLoaded();
      unsubConsumptionUpdates(); // NUEVO: Limpiar suscripción de consumo
    };
  }, [instanceId]);

  // Aplicar filtros cuando cambien los criterios o los dispositivos
  useEffect(() => {
    const filtrados = aplicarFiltros(dispositivos);
    setDispositivosFiltrados(filtrados);
  }, [dispositivos, aplicarFiltros]);
  
  // Manejadores de eventos
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

  // Manejadores para seleccionar/deseleccionar todo
  const handleSelectAllHabitaciones = useCallback(() => {
    const ids = todasHabitaciones.map(h => String(h.id));
    ids.push('sin-asignar'); // Añadir "sin asignar"
    setFiltroHabitaciones(ids);
  }, [todasHabitaciones]);
  
  const handleDeselectAllHabitaciones = useCallback(() => {
    setFiltroHabitaciones([]);
  }, []);
  
  const handleSelectAllModelos = useCallback(() => {
    setFiltroModelos([...todosModelos]);
  }, [todosModelos]);
  
  const handleDeselectAllModelos = useCallback(() => {
    setFiltroModelos([]);
  }, []);
  
  const handleToggleHabitacionFilter = useCallback((id: string) => {
    setFiltroHabitaciones(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else {
        return [...prev, id];
      }
    });
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

  // Función handleToggleDevice mejorada para evitar rebotes
  const handleToggleDevice = useCallback((deviceId: number) => {
    // Evitar operaciones si el componente está desmontado
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

  const handleCheckboxChange = useCallback((id: number) => {
    setSelectedItems(prevSelected => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter(itemId => itemId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  }, []);

  const handleAssignClick = useCallback(async () => {
    try {
      const habitacionesData = await getHabitaciones();
      // CAMBIO 1: Ordenar habitaciones alfabéticamente
      const sortedHabitaciones = [...habitacionesData].sort((a, b) => 
        a.nombre.localeCompare(b.nombre)
      );
      setHabitaciones(sortedHabitaciones);
      setOpen(true);
    } catch (error) {
      console.error('Error al obtener las habitaciones:', error);
    }
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (setShowRoomDialog) {
      setShowRoomDialog(false);
    }
  }, [setShowRoomDialog]);

  const handleHabitacionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedHabitacion(event.target.value);
  }, []);

  const handleAssign = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      const habitacionId = selectedHabitacion === "null" ? null : parseInt(selectedHabitacion);
      await asignarHabitacion(selectedItems, habitacionId);
      setSelectedItems([]);
      setOpen(false);
      
      if (setShowRoomDialog) {
        setShowRoomDialog(false);
      }
      
      // Después de asignar, refrescar dispositivos
      await DeviceStateService.loadInitialDevices();
      
      if (!isMounted.current) return;
      
      // Actualizar contadores locales
      const updatedDevices = DeviceStateService.getAllDevices();
      setContadorAsignados(updatedDevices.filter(d => d.habitacion_id).length);
      setContadorSinAsignar(updatedDevices.filter(d => !d.habitacion_id).length);
    } catch (error) {
      console.error(`[${instanceId}] Error al asignar habitación:`, error);
    }
  }, [selectedHabitacion, selectedItems, setShowRoomDialog, instanceId]);

  // Efecto para controlar el diálogo desde el componente padre
  useEffect(() => {
    if (showRoomDialog && !open) {
      handleAssignClick();
    }
  }, [showRoomDialog, open, handleAssignClick]);

  // Efecto para notificar al componente padre sobre cambios en los elementos seleccionados
  useEffect(() => {
    if (onSelectedItemsChange) {
      onSelectedItemsChange(selectedItems);
    }
  }, [selectedItems, onSelectedItemsChange]);

  return (
    <>
      <style>{globalStyles}</style>
      
      <Box
        data-instance-id={instanceId} // Para debugging
        display="flex"
        flexDirection="column"
        sx={{
          height: 'calc(100vh - 85px)',
          position: 'relative', // Necesario para posicionar elementos fixed/sticky dentro
        }}
      >
        {/* Fila para los controles de ordenación, filtrado y búsqueda - AHORA FIJA */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            position: 'sticky', // Fija la barra durante el scroll
            top: 0,
            zIndex: 10, // Asegura que quede por encima del contenido
            mb: 2,
            px: 2, // Reducido para que el campo de búsqueda llegue a los bordes
            height: '48px',
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
                onClick={() => handleSortSelect('consumo-mayor')} 
                selected={sortCriterion === 'consumo-mayor'}
                sx={{ 
                  fontSize: '0.85rem',
                  padding: '4px 16px', // Reducir altura
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
                  padding: '4px 16px', // Reducir altura
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
              {/* CAMBIO 2: Agregar criterio Por Estado */}
              <MenuItem 
                onClick={() => handleSortSelect('estado')} 
                selected={sortCriterion === 'estado'}
                sx={{ 
                  fontSize: '0.85rem',
                  padding: '4px 16px', // Reducir altura
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
                onClick={() => handleSortSelect('habitacion')} 
                selected={sortCriterion === 'habitacion'}
                sx={{ 
                  fontSize: '0.85rem',
                  padding: '4px 16px', // Reducir altura
                  '&.Mui-selected': { 
                    backgroundColor: 'rgba(35, 145, 255, 0.1)', 
                    color: '#2391FF'
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(35, 145, 255, 0.05)'
                  }
                }}
              >
                Por Habitación
              </MenuItem>
              <MenuItem 
                onClick={() => handleSortSelect('modelo')} 
                selected={sortCriterion === 'modelo'}
                sx={{ 
                  fontSize: '0.85rem',
                  padding: '4px 16px', // Reducir altura
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
                onClick={() => handleSortSelect('nombre')} 
                selected={sortCriterion === 'nombre'}
                sx={{ 
                  fontSize: '0.85rem',
                  padding: '4px 16px', // Reducir altura
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
            
            {/* Menús de filtrado */}
            <Button 
              startIcon={<FilterListIcon />}
              onClick={(e) => handleFilterClick(e, 'habitacion')}
              sx={{ 
                color: filtroHabitaciones.length > 0 ? '#2391FF' : 'white',
                fontWeight: filtroHabitaciones.length > 0 ? 'bold' : 'normal',
                textTransform: 'none',
                fontSize: '0.85rem',
                mr: 2
              }}
            >
              Filtrar por Habitación
              {filtroHabitaciones.length > 0 && ` (${filtroHabitaciones.length})`}
            </Button>
            
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
          
          {/* Campo de búsqueda - más fino */}
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
                height: '36px', // Más fino
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
                height: '36px', // Más fino
              }
            }}
          />
        </Box>
        
        {/* CAMBIO 3: Reordenar los contadores - Primero Filtrados, luego el resto */}
        <Box
          display="flex"
          justifyContent="flex-end"
          sx={{ mb: 2, pr: 4 }}
        >
          {/* Mostrar primero Filtrados */}
          {dispositivosFiltrados.length !== dispositivos.length && (
            <Typography variant="body1" sx={{ color: 'orange', mr: 1 }}>
              Filtrados: {dispositivosFiltrados.length}
            </Typography>
          )}
          
          <Typography variant="body1" sx={{ color: '#00FF00' }}>
            - Asignados: {contadorAsignados}
          </Typography>
          <Typography variant="body1" sx={{ color: 'white', mx: 1 }}>
            - Sin Asignar: {contadorSinAsignar}
          </Typography>
          <Typography variant="body1" sx={{ color: '#2391FF', fontWeight: 'bold' }}>
            - Totales: {dispositivos.length}
          </Typography>
        </Box>
        
        {/* Área de contenido con scroll - Ahora con virtualización */}
        <Box
          sx={{
            flex: 1,
            overflow: 'hidden', // Para no tener doble scroll
            height: 'calc(100% - 70px)' // Restar altura del contador y margen
          }}
        >
          {/* Área de filtros - Popover para filtro por habitación */}
          <Popover
            open={Boolean(filterAnchorEl) && filterMenuType === 'habitacion'}
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
                onClick={handleSelectAllHabitaciones}
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
                onClick={handleDeselectAllHabitaciones}
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
              width: '250px', 
              py: 0.5,
              '& .MuiListItemButton-root': {
                py: 0.2 // Reducir altura de los items
              }
            }}>
              <ListItemButton onClick={() => handleToggleHabitacionFilter('sin-asignar')}>
                <FilterCheckbox 
                  checked={filtroHabitaciones.includes('sin-asignar')} 
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
                  primary="Sin asignar" 
                  primaryTypographyProps={{ 
                    fontSize: '0.85rem',
                    fontWeight: filtroHabitaciones.includes('sin-asignar') ? 'bold' : 'normal'
                  }} 
                />
              </ListItemButton>
              {/* CAMBIO 1: Habitaciones ya ordenadas alfabéticamente desde la carga */}
              {todasHabitaciones.map((hab) => (
                <ListItemButton key={hab.id} onClick={() => handleToggleHabitacionFilter(String(hab.id))}>
                  <FilterCheckbox 
                    checked={filtroHabitaciones.includes(String(hab.id))} 
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
                    primary={hab.nombre} 
                    primaryTypographyProps={{ 
                      fontSize: '0.85rem',
                      fontWeight: filtroHabitaciones.includes(String(hab.id)) ? 'bold' : 'normal'
                    }} 
                  />
                </ListItemButton>
              ))}
            </List>
          </Popover>
          
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
              {/* CAMBIO 1: Modelos ya ordenados alfabéticamente desde la carga */}
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

          {/* Matriz de dispositivos - Ahora virtualizada */}
          <VirtualizedDeviceMatrix
            dispositivosFiltrados={dispositivosFiltrados}
            editMode={editMode}
            selectedItems={selectedItems}
            loadingDevices={loadingDevices}
            onToggleDevice={handleToggleDevice}
            onSelect={handleCheckboxChange}
          />
        </Box>
        
        {/* Diálogo con el mismo estilo de UsersManagement.tsx */}
        <Dialog 
          open={open} 
          onClose={handleClose}
          PaperProps={{
            style: {
              backgroundColor: '#333',
              color: 'white',
              borderRadius: '10px',
              minWidth: '300px'
            }
          }}
        >
          <DialogTitle sx={{ 
            color: '#2391FF', 
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}>
            Seleccionar habitación
          </DialogTitle>
          <DialogContent
            sx={{
              maxHeight: '600px',
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#222',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#2391FF',
                borderRadius: '10px',
              },
              pt: 1
            }}
          >
            <RadioGroup 
              value={selectedHabitacion} 
              onChange={handleHabitacionChange}
              sx={{ 
                '& .MuiFormControlLabel-root': {
                  marginBottom: '2px', // Reducir espacio entre opciones a la mitad
                }
              }}
            >
              <FormControlLabel 
                key="ninguna" 
                value="null" 
                control={
                  <Radio 
                    sx={{
                      color: 'white',
                      padding: '2px',
                      '&.Mui-checked': {
                        color: '#2391FF',
                      }
                    }} 
                  />
                } 
                label={
                  <Typography sx={{ 
                    color: 'white', 
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}>
                    Ninguna
                  </Typography>
                }
              />
              {habitaciones.map((habitacion) => (
                <FormControlLabel 
                  key={habitacion.id} 
                  value={habitacion.id.toString()} 
                  control={
                    <Radio 
                      sx={{
                        color: 'white',
                        padding: '2px',
                        '&.Mui-checked': {
                          color: '#2391FF',
                        }
                      }} 
                    />
                  } 
                  label={
                    <Typography sx={{ 
                      color: 'white', 
                      fontSize: '0.9rem' 
                    }}>
                      {habitacion.nombre}
                    </Typography>
                  }
                />
              ))}
            </RadioGroup>
          </DialogContent>
          <DialogActions sx={{ padding: '16px' }}>
            <Button 
              onClick={handleClose} 
              sx={{ 
                color: '#2391FF',
                '&:hover': {
                  backgroundColor: 'rgba(35, 145, 255, 0.1)',
                }
              }}
            >
              CANCELAR
            </Button>
            <Button 
              onClick={handleAssign} 
              variant="contained" 
              sx={{ 
                backgroundColor: '#2391FF', 
                color: 'black',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: '#1a70c7',
                }
              }}
            >
              GUARDAR
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

export default DeviceMatrix;
