import React, { useEffect, useState, useCallback, memo, useMemo, useRef } from 'react';
import { 
  Box, Typography, Card, Checkbox, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio,
  IconButton, CircularProgress, Menu, MenuItem, Popover, List,
  ListItemText, ListItemButton, Checkbox as FilterCheckbox, TextField, InputAdornment,
  Tooltip
} from '@mui/material';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import BoltIcon from '@mui/icons-material/Bolt';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import { getHabitaciones, asignarHabitacion } from '../services/api';
import { formatearConsumo, getColorForConsumo } from '../services/consumptionService';

// Importar sistema de eventos y servicio
import { eventBus } from '../services/EventBus';
import { DeviceStateService, Dispositivo } from '../services/DeviceStateService';

// Importamos todas las imágenes disponibles en la carpeta pictures
import dimmer2Image from '../pictures/DIMMER2.png';
import em3Image from '../pictures/EM3.png';
import emImage from '../pictures/EM.png';
import plus1pmImage from '../pictures/PLUS1PM.png';
import plus1Image from '../pictures/PLUS1.png';
import plus2pmImage from '../pictures/PLUS2PM.png';
import pro1pmImage from '../pictures/PRO1PM.png';
import proem50Image from '../pictures/PROEM50.png';

// Creamos un mapa entre los tipos de dispositivos y sus imágenes correspondientes
const deviceTypeImages: {[key: string]: string} = {
  'DIMMER2': dimmer2Image,
  'EM3': em3Image,
  'EM': emImage,
  'PLUS1PM': plus1pmImage,
  'PLUS1': plus1Image,
  'PLUS2PM': plus2pmImage,
  'PRO1PM': pro1pmImage,
  'PROEM50': proem50Image,
};

// Usamos plus1Image como imagen por defecto si no tenemos una específica
const defaultImage = plus1Image;

// Dimensiones de tarjeta (incluyendo el aumento del 10%)
const CARD_WIDTH = 264; // 240px + 10%
const CARD_HEIGHT = 55; // 50px + 10%
const CARD_MARGIN = 4; // 0.5 * 8px (el valor del 'gap' en Material UI)
const TOTAL_CARD_WIDTH = CARD_WIDTH + (CARD_MARGIN * 2);
const TOTAL_CARD_HEIGHT = CARD_HEIGHT + (CARD_MARGIN * 2);

// Tamaños para el botón y el círculo (con el aumento adicional del 10%)
const POWER_BUTTON_SIZE = 39; // 35px + 10% (redondeando)
const CIRCLE_SIZE = 45;       // 41px + 10% (redondeando)

// CAMBIO 1: Aumentar el tiempo de animación para hacer la transición más visible
const ANIMATION_DURATION = 0.3; // Cambiado de 0.05s a 0.3s

// Definimos los tipos de ordenación
type SortCriterion = 'consumo-mayor' | 'consumo-menor' | 'habitacion' | 'modelo' | 'nombre';
type FilterType = 'habitacion' | 'modelo' | 'online' | 'offline';

// CSS para scrollbars consistente en toda la aplicación
const scrollbarStyle = `
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background-color: black;
  }
  ::-webkit-scrollbar-thumb {
    background-color: #2391FF;
    border-radius: 3px;
  }
`;

// Definimos un estilo global para las animaciones y scrollbars
const globalStyles = `
  @keyframes ringAnimationOn {
    0% { 
      transform: scale(1); 
      border-color: white;
    }
    100% { 
      transform: scale(1); 
      border-color: #2391FF;
    }
  }
  
  @keyframes ringAnimationOff {
    0% { 
      transform: scale(1); 
      border-color: #2391FF;
    }
    100% { 
      transform: scale(1); 
      border-color: white;
    }
  }
  
  .power-ring-on {
    animation: ringAnimationOn ${ANIMATION_DURATION}s ease-in-out forwards;
  }
  
  .power-ring-off {
    animation: ringAnimationOff ${ANIMATION_DURATION}s ease-in-out forwards;
  }

  ${scrollbarStyle}

  /* Aplicar a los popovers de Material UI */
  .MuiPopover-paper {
    ${scrollbarStyle}
  }

  /* Optimización para las tarjetas */
  .device-card {
    contain: content;
    will-change: transform;
  }
`;

// Componente para el botón de encendido con animación - Optimizado con memo
const PowerButton = memo(({ isOn, isLoading, onClick, deviceId }: { 
  isOn: boolean; 
  isLoading: boolean; 
  onClick: (id: number) => void;
  deviceId: number;
}) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClick(deviceId);
  }, [deviceId, onClick]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: POWER_BUTTON_SIZE,
        height: POWER_BUTTON_SIZE,
      }}
    >
      {/* Indicador de carga superpuesto usando opacidad */}
      {isLoading && (
        <CircularProgress
          size={POWER_BUTTON_SIZE}
          sx={{
            color: '#2391FF',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 2,
          }}
        />
      )}
      
      {/* El botón siempre está presente, solo cambia su opacidad */}
      <IconButton
        onClick={handleClick}
        disabled={isLoading}
        size="small"
        sx={{
          position: 'relative',
          width: POWER_BUTTON_SIZE,
          height: POWER_BUTTON_SIZE,
          borderRadius: '50%',
          backgroundColor: isOn ? 'white' : '#383838',
          '&:hover': {
            backgroundColor: isOn ? '#f5f5f5' : '#404040',
          },
          p: 0,
          boxShadow: 'none',
          transition: 'none',
          opacity: isLoading ? 0.3 : 1, // Cambia opacidad durante la carga
        }}
      >
        <PowerSettingsNewIcon
          sx={{
            fontSize: '1.2rem',
            color: isOn ? '#2391FF' : 'white',
            transition: `color ${ANIMATION_DURATION}s ease-in-out`,
          }}
        />
        
        <Box
          className={isOn ? 'power-ring-on' : 'power-ring-off'}
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: isOn 
              ? '4px solid #2391FF'
              : '2px solid white',
            boxShadow: 'none',
            transition: 'none',
          }}
        />
      </IconButton>
    </Box>
  );
});

// Componente para mostrar la imagen del tipo de dispositivo - Optimizado con memo
const DeviceTypeImage = memo(({ tipo }: { tipo: string }) => {
  // Usamos useMemo para evitar recalcular la imagen en cada render
  const imageSource = useMemo(() => {
    return deviceTypeImages[tipo] || defaultImage;
  }, [tipo]);
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: CIRCLE_SIZE, // Aumentado un 10% adicional
        height: CIRCLE_SIZE, // Aumentado un 10% adicional
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1B1D21',
      }}
    >
      <img
        src={imageSource}
        alt={`Tipo: ${tipo}`}
        style={{
          width: '80%',
          height: '80%',
          objectFit: 'contain',
        }}
      />
    </Box>
  );
});

// Componente para cada tarjeta de dispositivo - Optimizado con un memo avanzado
const DeviceCard = memo(({ 
  dispositivo, 
  isEditing, 
  isSelected, 
  onToggleDevice, 
  onSelect,
  loadingDevices,
  style
}: {
  dispositivo: Dispositivo;
  isEditing: boolean;
  isSelected: boolean;
  onToggleDevice: (id: number) => void;
  onSelect: (id: number) => void;
  loadingDevices: {[key: number]: boolean};
  style?: React.CSSProperties; // Para virtualización
}) => {
  // Memoizamos los cálculos frecuentes para evitar recalculos innecesarios
  const formattedConsumo = useMemo(() => formatearConsumo(dispositivo.consumo), [dispositivo.consumo]);
  const consumoColor = useMemo(() => getColorForConsumo(dispositivo.consumo), [dispositivo.consumo]);
  const isOnline = Boolean(dispositivo.online);
  const isLoading = loadingDevices[dispositivo.id] || false;
  const isAssigned = Boolean(dispositivo.habitacion_id);
  const isOn = Boolean(dispositivo.estado);

  // Ajustamos el padding izquierdo para acomodar el círculo más grande
  const paddingLeft = 65; // Aumentado para dar espacio al círculo más grande
  
  // Calcular el centro horizontal de la tarjeta para los íconos
  const cardCenterX = CARD_WIDTH / 2; // Centro de la tarjeta 
  const iconSize = 12; // Tamaño aproximado de los iconos
  const iconSpacing = 8; // Espacio entre los iconos

  // Memoizamos el callback para evitar re-renders innecesarios
  const handleSelect = useCallback(() => {
    onSelect(dispositivo.id);
  }, [dispositivo.id, onSelect]);

  return (
    <div style={{
      ...style,
      padding: CARD_MARGIN,
      boxSizing: 'border-box',
      willChange: 'transform',
    }}>
      <Card
        className="device-card"
        sx={{
          backgroundColor: '#2F3235',
          color: 'white',
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          textAlign: 'center',
          borderRadius: '8px',
          position: 'relative',
          p: 1.5,
        }}
      >
        {/* CAMBIO: Ahora X (sin habitación) va a la izquierda del centro */}
        {!isAssigned && (
          <Tooltip 
            title="Sin habitación" 
            arrow 
            placement="top"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: '#333',
                  color: 'white',
                  fontSize: '0.7rem',
                  boxShadow: '0px 2px 8px rgba(0,0,0,0.6)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                }
              },
              arrow: {
                sx: {
                  color: '#333'
                }
              }
            }}
          >
            <CloseIcon
              sx={{
                position: 'absolute',
                bottom: '4px',
                left: `${cardCenterX - iconSize - (iconSpacing/2)}px`,
                color: '#ff4444',
                fontSize: '0.75rem'
              }}
            />
          </Tooltip>
        )}
        
        {/* CAMBIO: Ahora nube (offline) va a la derecha del centro */}
        {!isOnline && (
          <Tooltip 
            title="Offline" 
            arrow 
            placement="top"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: '#333',
                  color: 'white',
                  fontSize: '0.7rem',
                  boxShadow: '0px 2px 8px rgba(0,0,0,0.6)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                }
              },
              arrow: {
                sx: {
                  color: '#333'
                }
              }
            }}
          >
            <CloudOffIcon
              sx={{
                position: 'absolute',
                bottom: '4px',
                left: `${cardCenterX + (iconSpacing/2)}px`,
                color: '#ff4444',
                fontSize: '0.75rem'
              }}
            />
          </Tooltip>
        )}
        
        {isEditing && (
          <Checkbox
            checked={isSelected}
            onChange={handleSelect}
            sx={{
              position: 'absolute',
              bottom: '-5px',
              right: '-5px',
              color: 'red',
              '& .MuiSvgIcon-root': {
                color: isSelected ? 'red' : 'red',
              },
              '&.Mui-checked': {
                backgroundColor: 'none',
              },
            }}
          />
        )}
        
        {/* Imagen del tipo de dispositivo al lado izquierdo - Reposicionada para el círculo más grande */}
        <Box sx={{ 
          position: 'absolute',
          left: '8px', // Ajustado para mantener el mismo margen visual
          top: '5px', // Ajustado para centrar en la tarjeta
        }}>
          <DeviceTypeImage tipo={dispositivo.tipo} />
        </Box>
        
        {/* Nombre del dispositivo - Ajustado para dar más espacio al círculo más grande */}
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.65rem',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            height: '40%',
            position: 'absolute',
            top: '10px',
            left: `${paddingLeft}px`, // Aumentado para dar espacio al círculo más grande
            right: '45px', // Espacio adicional para el botón más grande
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {dispositivo.nombre}
        </Typography>
        
        {/* Botón de encendido/apagado - Reposicionado para el botón más grande */}
        {!isEditing && isOnline && (
          <Box sx={{ 
            position: 'absolute',
            right: '9px', // Ajustado para el botón más grande
            top: '8px', // Ajustado para el botón más grande
          }}>
            <PowerButton 
              isOn={isOn} 
              isLoading={isLoading}
              onClick={onToggleDevice}
              deviceId={dispositivo.id}
            />
          </Box>
        )}
        
        {/* Información de consumo - Solo se muestra si el dispositivo está online */}
        {isOnline && (
          <Box 
            display="flex" 
            alignItems="center" 
            justifyContent="flex-start"
            sx={{
              position: 'absolute',
              bottom: '10px',
              left: `${paddingLeft}px`, // Aumentado para alinear con el nombre
              right: '40px',
            }}
          >
            <BoltIcon sx={{ fontSize: '0.75rem', color: consumoColor, mr: 0.5 }} />
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.65rem',
                fontWeight: 'bold',
                color: consumoColor,
              }}
            >
              {formattedConsumo}
            </Typography>
          </Box>
        )}
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  // Implementamos un comparador de igualdad personalizado para DeviceCard
  // Solo re-renderizamos si uno de estos valores ha cambiado
  return (
    prevProps.dispositivo.id === nextProps.dispositivo.id &&
    prevProps.dispositivo.estado === nextProps.dispositivo.estado &&
    prevProps.dispositivo.consumo === nextProps.dispositivo.consumo &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.loadingDevices[prevProps.dispositivo.id] === nextProps.loadingDevices[nextProps.dispositivo.id] &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
  );
});

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
          
          // CAMBIO 2: Añadir margen izquierdo igual al espacio entre tarjetas
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
                  items: dispositivosFiltrados,
                  columnCount,
                  editMode,
                  selectedItems,
                  loadingDevices,
                  onToggleDevice,
                  onSelect
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
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>('habitacion');
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

  // Usar ref para tracking de montaje del componente (NUEVA)
  const isMounted = useRef(true);
  // ID única para esta instancia (NUEVA)
  const [instanceId] = useState(() => `matrix_${Date.now()}`);

  // Efecto para suscribirse a eventos
  useEffect(() => {
    console.log(`[${instanceId}] DeviceMatrix: Inicializando suscripciones a eventos`);
    isMounted.current = true; // Marcar componente como montado
    
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
    
    // Cargar dispositivos desde el nuevo servicio
    const fetchData = async () => {
      try {
        console.log(`[${instanceId}] DeviceMatrix: Cargando dispositivos desde servicio centralizado`);
        
        // Obtener habitaciones para filtros
        const habitacionesData = await getHabitaciones();
        if (!isMounted.current) return;
        setTodasHabitaciones(habitacionesData);
        
        // Usar el servicio centralizado para obtener todos los dispositivos
        const devices = await DeviceStateService.loadInitialDevices();
        if (!isMounted.current) return;
        
        // Extraer modelos para filtros
        const tiposSet = new Set<string>();
        devices.forEach(d => {
          if (d.tipo) tiposSet.add(d.tipo);
        });
        const modelos: string[] = Array.from(tiposSet);
        setTodosModelos(modelos);
        
        // Actualizar contadores y dispositivos
        setDispositivos(devices);
                
        setContadorAsignados(devices.filter((d: Dispositivo) => d.habitacion_id).length);
        setContadorSinAsignar(devices.filter((d: Dispositivo) => !d.habitacion_id).length);

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
      const modelos: string[] = Array.from(tiposSet);
      setTodosModelos(modelos);
    });

    // Limpiar suscripción al desmontar
    return () => {
      unsubDevicesLoaded();
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

  // CORRECCIÓN: Función handleToggleDevice mejorada para evitar rebotes

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
        
        {/* Contador de dispositivos - Movido fuera del área de scroll para evitar repintados */}
        <Box
          display="flex"
          justifyContent="flex-end"
          sx={{ mb: 2, pr: 4 }}
        >
          <Typography variant="body1" sx={{ color: '#00FF00' }}>
            Asignados: {contadorAsignados}
          </Typography>
          <Typography variant="body1" sx={{ color: 'white', mx: 1 }}>
            - Sin Asignar: {contadorSinAsignar}
          </Typography>
          <Typography variant="body1" sx={{ color: '#2391FF', fontWeight: 'bold' }}>
            - Totales: {dispositivos.length}
          </Typography>
          {dispositivosFiltrados.length !== dispositivos.length && (
            <Typography variant="body1" sx={{ color: 'orange', ml: 1 }}>
              - Filtrados: {dispositivosFiltrados.length}
            </Typography>
          )}
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
