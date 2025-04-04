import React, { useEffect, useState, useCallback, memo } from 'react';
import { 
  Box, Typography, Card, Checkbox, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio,
  IconButton, CircularProgress, Menu, MenuItem, Popover, List,
  ListItemText, ListItemButton, Checkbox as FilterCheckbox, TextField, InputAdornment
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { getDispositivos, getHabitaciones, asignarHabitacion, toggleDevice } from '../services/api';
import {
  DispositivoConConsumo,
  obtenerDispositivosConConsumo,
  formatearConsumo,
  getColorForConsumo,
  iniciarActualizacionPeriodica,
  suscribirseADispositivosActualizados
} from '../services/consumptionService';

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
    animation: ringAnimationOn 0.15s ease-in-out forwards;
  }
  
  .power-ring-off {
    animation: ringAnimationOff 0.15s ease-in-out forwards;
  }

  ${scrollbarStyle}

  /* Aplicar a los popovers de Material UI */
  .MuiPopover-paper {
    ${scrollbarStyle}
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
    <IconButton
      onClick={handleClick}
      disabled={isLoading}
      size="small"
      sx={{
        position: 'relative',
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: isOn ? 'white' : '#383838',
        '&:hover': {
          backgroundColor: isOn ? '#f5f5f5' : '#404040',
        },
        p: 0,
        boxShadow: 'none',
        transition: 'none',
      }}
    >
      {isLoading ? (
        <CircularProgress
          size={24}
          sx={{
            color: '#2391FF',
          }}
        />
      ) : (
        <>
          <PowerSettingsNewIcon
            sx={{
              fontSize: '1rem',
              color: isOn ? '#2391FF' : 'white',
              transition: 'color 0.15s ease-in-out',
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
        </>
      )}
    </IconButton>
  );
});

// Componente para mostrar la imagen del tipo de dispositivo - Optimizado con memo
const DeviceTypeImage = memo(({ tipo }: { tipo: string }) => {
  const imageSource = deviceTypeImages[tipo] || defaultImage;
  
  // Aumentamos el tamaño del círculo y la imagen en un 15%
  const circleSize = 37; // 32 + 15% = ~37
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: circleSize,
        height: circleSize,
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

// Componente para cada tarjeta de dispositivo - Optimizado con memo
const DeviceCard = memo(({ 
  dispositivo, 
  isEditing, 
  isSelected, 
  onToggleDevice, 
  onSelect,
  loadingDevices
}: {
  dispositivo: DispositivoConConsumo;
  isEditing: boolean;
  isSelected: boolean;
  onToggleDevice: (id: number) => void;
  onSelect: (id: number) => void;
  loadingDevices: {[key: number]: boolean};
}) => {
  // Memoizar cálculos frecuentes
  const formattedConsumo = formatearConsumo(dispositivo.consumo);
  const consumoColor = getColorForConsumo(dispositivo.consumo);
  const isOnline = Boolean(dispositivo.online);
  const isLoading = loadingDevices[dispositivo.id] || false;

  // Aumentamos el padding izquierdo para acomodar el círculo más grande
  const paddingLeft = 45; // Ajustado para el círculo más grande

  return (
    <Card
      sx={{
        m: 0.5,
        p: 1.5,
        backgroundColor: '#2F3235',
        color: 'white',
        width: '240px',
        height: '50px',
        textAlign: 'center',
        borderRadius: '8px',
        position: 'relative',
      }}
    >
      {!isOnline && (
        <CloudOffIcon
          sx={{
            position: 'absolute',
            top: '2px',
            right: '6px',
            color: '#ff4444',
            fontSize: '0.5rem'
          }}
        />
      )}
      
      {dispositivo.habitacion_id && (
        <CheckCircleIcon
          sx={{
            position: 'absolute',
            bottom: '2px',
            right: '6px',
            color: '#00FF00',
            fontSize: '0.5rem'
          }}
        />
      )}
      
      {isEditing && (
        <Checkbox
          checked={isSelected}
          onChange={() => onSelect(dispositivo.id)}
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
      
      <Box sx={{ 
        position: 'absolute',
        left: '8px',
        top: '7px',  // Ajustado para el círculo más grande
      }}>
        <DeviceTypeImage tipo={dispositivo.tipo} />
      </Box>
      
      <Typography
        variant="body2"
        sx={{
          fontSize: '0.6rem',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50%',
          mb: 0.5,
          position: 'relative', 
          paddingLeft: `${paddingLeft}px`, // Espacio para la imagen del tipo (agrandada)
          paddingRight: '40px', // Espacio para el botón
        }}
      >
        {dispositivo.nombre}
      </Typography>
      
      {!isEditing && isOnline && (
        <Box sx={{ 
          position: 'absolute',
          right: '8px',
          top: '10px',
        }}>
          <PowerButton 
            isOn={Boolean(dispositivo.estado)} 
            isLoading={isLoading}
            onClick={onToggleDevice}
            deviceId={dispositivo.id}
          />
        </Box>
      )}
      
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        sx={{
          paddingLeft: `${paddingLeft}px`, // Espacio para la imagen del tipo (agrandada)
          paddingRight: '40px',
        }}
      >
        <BoltIcon sx={{ fontSize: '0.75rem', color: consumoColor, mr: 0.5 }} />
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.6rem',
            fontWeight: 'bold',
            color: consumoColor,
          }}
        >
          {formattedConsumo}
        </Typography>
      </Box>
    </Card>
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
  const [dispositivos, setDispositivos] = useState<DispositivoConConsumo[]>([]);
  const [dispositivosFiltrados, setDispositivosFiltrados] = useState<DispositivoConConsumo[]>([]);
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

  // Optimizaciones con useCallback para funciones que no cambian con frecuencia
  const ordenarDispositivos = useCallback((dispositivos: DispositivoConConsumo[], criterio: SortCriterion) => {
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
  
  const aplicarFiltros = useCallback((dispositivos: DispositivoConConsumo[]) => {
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
    iniciarActualizacionPeriodica();

    const fetchDispositivos = async () => {
      try {
        const data = await obtenerDispositivosConConsumo();
        const habitacionesData = await getHabitaciones();
        setTodasHabitaciones(habitacionesData);
        
        const tiposSet = new Set<string>();
        data.forEach(d => {
          if (d.tipo) tiposSet.add(d.tipo);
        });
        const modelos: string[] = Array.from(tiposSet);
        setTodosModelos(modelos);
        
        const total = data.length;
        const datosModificados = data.map((dispositivo, index) => {
          const isOnline = index < (total - 8);
          const estado = isOnline ? 1 : 0;
          
          return {
            ...dispositivo,
            online: isOnline,
            estado: estado
          };
        });
        
        setDispositivos(datosModificados);
        setContadorAsignados(data.filter((d) => d.habitacion_id).length);
        setContadorSinAsignar(data.filter((d) => !d.habitacion_id).length);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    fetchDispositivos();

    // Solo actualizar consumos, no perder filtros ni ordenamientos
    const unsuscribir = suscribirseADispositivosActualizados(async () => {
      const newData = await obtenerDispositivosConConsumo();
      
      setDispositivos(prevDispositivos => {
        // Solo actualizar consumo, manteniendo todos los demás estados
        const updatedDispositivos = prevDispositivos.map(disp => {
          const dispActualizado = newData.find(d => d.id === disp.id);
          if (dispActualizado) {
            return {
              ...disp,
              consumo: dispActualizado.consumo 
            };
          }
          return disp;
        });
        
        return updatedDispositivos;
      });
    });

    return () => {
      unsuscribir();
    };
  }, []);

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

  const handleToggleDevice = useCallback(async (deviceId: number) => {
    try {
      setLoadingDevices(prev => ({ ...prev, [deviceId]: true }));
      await toggleDevice(deviceId);
      
      setDispositivos(prevDispositivos => {
        return prevDispositivos.map(disp => {
          if (disp.id === deviceId) {
            return { 
              ...disp, 
              estado: disp.estado ? 0 : 1
            };
          }
          return disp;
        });
      });
    } catch (error) {
      console.error('Error al cambiar estado del dispositivo:', error);
    } finally {
      setLoadingDevices(prev => ({ ...prev, [deviceId]: false }));
    }
  }, []);

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
    try {
      const habitacionId = selectedHabitacion === "null" ? null : parseInt(selectedHabitacion as string);
      await asignarHabitacion(selectedItems, habitacionId);
      setSelectedItems([]);
      setOpen(false);
      
      if (setShowRoomDialog) {
        setShowRoomDialog(false);
      }
      
      const data = await obtenerDispositivosConConsumo(true);
      
      const datosModificados = data.map((dispositivo) => {
        const dispPrevio = dispositivos.find(d => d.id === dispositivo.id);
        
        if (dispPrevio) {
          return {
            ...dispositivo,
            online: dispPrevio.online,
            estado: dispPrevio.estado
          };
        }
        
        return {
          ...dispositivo,
          online: true,
          estado: 1
        };
      });
      
      setDispositivos(datosModificados);
      setContadorAsignados(datosModificados.filter((d) => d.habitacion_id).length);
      setContadorSinAsignar(datosModificados.filter((d) => !d.habitacion_id).length);
    } catch (error) {
      console.error('Error al asignar habitación:', error);
    }
  }, [dispositivos, selectedHabitacion, selectedItems, setShowRoomDialog]);

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
        
        {/* Área de contenido con scroll */}
        <Box
          sx={{
            overflowY: 'scroll',
            flex: 1,
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
          {/* Popover para filtro por habitación */}
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

          {/* Contador de dispositivos */}
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
          
          {/* Matriz de dispositivos - Optimizada con componente memoizado */}
          <Box
            display="flex"
            flexWrap="wrap"
            gap={0.5}
          >
            {dispositivosFiltrados.map((dispositivo) => (
              <DeviceCard
                key={dispositivo.id}
                dispositivo={dispositivo}
                isEditing={editMode}
                isSelected={selectedItems.includes(dispositivo.id)}
                onToggleDevice={handleToggleDevice}
                onSelect={handleCheckboxChange}
                loadingDevices={loadingDevices}
              />
            ))}
          </Box>
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
