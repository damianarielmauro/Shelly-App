import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { getDispositivos, getHabitaciones } from '../services/api';

interface DeviceListProps {
  habitacionesPermitidas: number[];
}

const DeviceList: React.FC<DeviceListProps> = ({ habitacionesPermitidas }) => {
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [totalDispositivos, setTotalDispositivos] = useState(0);
  const [totalConsumo, setTotalConsumo] = useState(0);
  // Estado para almacenar los consumos actualizados de cada dispositivo
  const [consumosDispositivos, setConsumosDispositivos] = useState<{[key: number]: number}>({});
  // Estado para la generación/consumo total
  const [generacionTotal, setGeneracionTotal] = useState<number>(-12800);

  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        const data = await getDispositivos();
        
        // Filtramos los dispositivos para mostrar solo los que pertenecen a habitaciones permitidas
        const dispositivosFiltrados = data.filter((dispositivo: any) => 
          dispositivo.habitacion_id && habitacionesPermitidas.includes(dispositivo.habitacion_id)
        );
        
        setDispositivos(dispositivosFiltrados);
        setTotalDispositivos(dispositivosFiltrados.length);
        
        // Crear objeto inicial de consumos
        const consumosIniciales: {[key: number]: number} = {};
        dispositivosFiltrados.forEach((dispositivo: any) => {
          consumosIniciales[dispositivo.id] = Math.floor(Math.random() * (3578 - 7 + 1)) + 7;
        });
        setConsumosDispositivos(consumosIniciales);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    fetchDispositivos();

    // Configurar actualización de consumos cada 2 segundos
    const intervalo = setInterval(() => {
      // Actualizar consumos de dispositivos individuales
      setConsumosDispositivos(prev => {
        const nuevosConsumos: {[key: number]: number} = {};
        Object.keys(prev).forEach(id => {
          nuevosConsumos[Number(id)] = Math.floor(Math.random() * (3578 - 7 + 1)) + 7;
        });
        return nuevosConsumos;
      });

      // Actualizar el consumo/generación total (alternando entre valores negativos y positivos)
      setGeneracionTotal(prev => {
        // Simular una fluctuación del 10% arriba o abajo
        const fluctuacion = prev * 0.1 * (Math.random() > 0.5 ? 1 : -1);
        return Math.round(prev + fluctuacion);
      });
    }, 2000);

    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(intervalo);
  }, [habitacionesPermitidas]);

  // Formato y color para el valor de generación/consumo total
  const consumoColor = generacionTotal >= 0 ? '#1E8FFF' : '#00ff00'; 
  const formattedConsumo = generacionTotal < 1000 && generacionTotal > -1000 
    ? `${generacionTotal} W` 
    : `${(generacionTotal / 1000).toFixed(2)} kW`;
  const consumoLabel = generacionTotal >= 0 ? 'Consumo Total' : 'Generación Total';

  const getColorForConsumo = (consumo: number) => {
    return consumo >= 0 ? '#1E8FFF' : '#00ff00';
  };

  // Ordenar dispositivos por consumo (de mayor a menor)
  const dispositivosOrdenados = [...dispositivos].sort((a, b) => {
    const consumoA = consumosDispositivos[a.id] || 0;
    const consumoB = consumosDispositivos[b.id] || 0;
    return consumoB - consumoA; // Orden descendente
  });

  return (
    <Box className="device-list" sx={{ 
      backgroundColor: '#333', 
      borderRadius: '8px', 
      color: 'white', 
      maxWidth: '300px', 
      height: 'calc(100vh - 85px)', 
      overflowY: 'auto', 
      overflowX: 'hidden', 
      padding: '8px',
      '&::-webkit-scrollbar': {
        width: '6px',
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: '#000',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#1ECAFF',
        borderRadius: '3px',
      },
    }}>
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
        {dispositivosOrdenados.map((dispositivo, index) => {
          // Usar el consumo actualizado para este dispositivo desde el estado
          const consumo = consumosDispositivos[dispositivo.id] || 0;
          const formattedConsumo = consumo < 1000 ? `${consumo} W` : `${(consumo / 1000).toFixed(2)} kW`;
          const consumoColor = getColorForConsumo(consumo);
          
          // Determinar si este dispositivo está entre los Top 10
          const isTop10 = index < 10;
          
          return (
            <ListItem key={dispositivo.id} sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              py: 0.2, 
              px: 0.5 
            }} className="device-list-item">
              <Typography sx={{ 
                fontSize: '0.75rem', 
                mr: 1, 
                flexShrink: 1, 
                whiteSpace: 'nowrap', 
                textOverflow: 'ellipsis', 
                overflow: 'hidden', 
                maxWidth: '65%',
                fontWeight: isTop10 ? 'bold' : 'normal' // Negrita para Top 10
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
                fontWeight: isTop10 ? 'bold' : 'normal' // Negrita para Top 10
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
