import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { getDispositivos } from '../services/api';
import { obtenerDispositivosConConsumo } from '../services/consumptionService';

// Definimos una interfaz para nuestros dispositivos
interface Dispositivo {
  id: number;
  nombre: string;
  habitacion_id?: number | null;
  consumo?: number;
  // Otros campos que pueda tener el dispositivo
}

// Definimos la interfaz de propiedades para el componente
interface DeviceListProps {
  // Propiedades opcionales
  habitaciones?: any[];
  deleteMode?: boolean;
  selectedItems?: number[];
  handleDeleteSelectionChange?: (id: number) => void;
  // Agregar cualquier otra propiedad que pueda necesitar
  [key: string]: any; // Esto permite propiedades adicionales
}

const DeviceList: React.FC<DeviceListProps> = (props) => {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [totalDispositivos, setTotalDispositivos] = useState(0);
  const [dispositivosConConsumo, setDispositivosConConsumo] = useState<Dispositivo[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        // Obtenemos la lista base de dispositivos solo la primera vez
        const data = await getDispositivos();
        setDispositivos(data);
        setTotalDispositivos(data.length);

        // Obtener los dispositivos con consumos actualizados
        const dispositivosActualizados = await obtenerDispositivosConConsumo();

        // Ordenar dispositivos por consumo de mayor a menor (considerando valores absolutos para comparación)
        const dispositivosOrdenados = dispositivosActualizados.sort((a: Dispositivo, b: Dispositivo) => 
          Math.abs(b.consumo || 0) - Math.abs(a.consumo || 0)
        );

        setDispositivosConConsumo(dispositivosOrdenados);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    // Obtener datos iniciales
    fetchDispositivos();
    
    // Actualizar datos cada 2 segundos
    const interval = setInterval(async () => {
      try {
        const dispositivosActualizados = await obtenerDispositivosConConsumo();
        
        // Ordenar dispositivos por consumo de mayor a menor (considerando valores absolutos)
        const dispositivosOrdenados = dispositivosActualizados.sort((a: Dispositivo, b: Dispositivo) => 
          Math.abs(b.consumo || 0) - Math.abs(a.consumo || 0)
        );

        setDispositivosConConsumo(dispositivosOrdenados);
      } catch (error) {
        console.error('Error al actualizar dispositivos:', error);
      }
    }, 2000);
    
    setRefreshInterval(interval);
    
    // Limpieza al desmontar
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  // Valor fijo para el consumo total: -12.80kW
  const totalConsumo = -12800; // -12.80kW en W
  
  const consumoColor = totalConsumo >= 0 ? '#1ECAFF' : '#00ff00'; // Verde para valores negativos
  const formattedConsumo = "-12.80 kW"; // Valor fijo formateado
  const consumoLabel = "Generación Total"; // Como es negativo, será "Generación Total"

  const getColorForConsumo = (consumo: number) => {
    return consumo >= 0 ? '#1ECAFF' : '#00ff00'; // Nuevo color azul para positivos
  };

  // Estilos de la barra de desplazamiento
  const scrollbarStyle = {
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: '#000', // Fondo negro
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#1ECAFF', // Cambiado al nuevo color azul
      borderRadius: '3px', // Bordes redondeados para el thumb
    },
    // Firefox scrollbar
    scrollbarWidth: 'thin',
    scrollbarColor: '#1ECAFF #000', // thumb y track
  };

  return (
    <Box 
      className="device-list" 
      sx={{ 
        backgroundColor: '#333', 
        borderRadius: '8px', 
        color: 'white', 
        width: '280px', 
        minWidth: '280px', 
        height: 'calc(100vh - 85px)', 
        overflowY: 'auto', 
        overflowX: 'hidden', 
        padding: '10px',
        flexShrink: 0,
        ...scrollbarStyle
      }}
    >
      <Box sx={{ backgroundColor: '#444', borderRadius: '8px', padding: '8px', textAlign: 'center', mb: 1 }}>
        <BoltIcon sx={{ color: consumoColor }} />
        <Typography sx={{ color: consumoColor, fontSize: '1rem', fontWeight: 'bold' }}>{formattedConsumo}</Typography>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{consumoLabel}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ backgroundColor: '#444', borderRadius: '8px', padding: '8px', textAlign: 'center', width: '48%' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 'bold' }}>4</Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Offline</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#444', borderRadius: '8px', padding: '8px', textAlign: 'center', width: '48%' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 'bold' }}>{totalDispositivos}</Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Total</Typography>
        </Box>
      </Box>
      <List sx={{ padding: 0 }}>
        {dispositivosConConsumo.map((dispositivo, index) => {
          const consumo = dispositivo.consumo || 0;
          const formattedConsumo = consumo < 1000 && consumo > -1000 
            ? `${consumo} W` 
            : `${(consumo / 1000).toFixed(2)} kW`;
          const consumoColor = getColorForConsumo(consumo);
          
          // Determinar si este dispositivo debe estar en negrita (primeros 10)
          const estaEnNegrita = index < 10;
          
          return (
            <ListItem 
              key={dispositivo.id} 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                py: 0.2, 
                px: 0.5,
                width: '100%',
              }} 
              className="device-list-item"
            >
              <Typography sx={{ 
                fontSize: '0.75rem', 
                mr: 1, 
                flexGrow: 1, 
                flexShrink: 1, 
                whiteSpace: 'nowrap', 
                textOverflow: 'ellipsis', 
                overflow: 'hidden', 
                maxWidth: '65%',
                fontWeight: estaEnNegrita ? 'bold' : 'normal'
              }}>
                {dispositivo.nombre}
              </Typography>
              <Typography sx={{ 
                fontSize: '0.75rem', 
                color: consumoColor, 
                flexShrink: 0, 
                whiteSpace: 'nowrap', 
                textOverflow: 'ellipsis', 
                overflow: 'hidden',
                maxWidth: '35%',
                fontWeight: estaEnNegrita ? 'bold' : 'normal'
              }}>
                {formattedConsumo}
              </Typography>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

export default DeviceList;
