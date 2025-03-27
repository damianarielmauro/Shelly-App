import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { getDispositivos } from '../services/api';

// Interfaz para tipado de dispositivos
interface Dispositivo {
  id: number;
  nombre: string;
  habitacion_id?: number;
  tipo?: string;
  ubicacion?: string;
}

interface DeviceListProps {
  habitacionesPermitidas: number[];
  isAdmin?: boolean;
}

const DeviceList: React.FC<DeviceListProps> = ({ habitacionesPermitidas, isAdmin = false }) => {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [totalDispositivos, setTotalDispositivos] = useState(0);
  const [dispositivosOffline, setDispositivosOffline] = useState(4); // Valor ejemplo
  const [totalConsumo, setTotalConsumo] = useState(-12800); // Valor inicial en W
  const [consumosDispositivos, setConsumosDispositivos] = useState<{[key: number]: number}>({});
  const [top10Ids, setTop10Ids] = useState<number[]>([]);

  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        const data = await getDispositivos();
        
        // Para admins, mostrar todos los dispositivos
        if (isAdmin) {
          console.log("Admin: mostrando todos los dispositivos");
          setDispositivos(data);
          setTotalDispositivos(data.length);
        } else {
          // Para usuarios regulares, aplicar el filtro por habitaciones permitidas
          const dispositivosFiltrados = data.filter((d: Dispositivo) => 
            d.habitacion_id && habitacionesPermitidas.includes(d.habitacion_id)
          );
          
          console.log(`Dispositivos filtrados: ${dispositivosFiltrados.length} de ${data.length}`);
          setDispositivos(dispositivosFiltrados);
          setTotalDispositivos(dispositivosFiltrados.length);
        }
        
        // Inicializar consumos aleatorios para cada dispositivo
        const consumos: {[key: number]: number} = {};
        const dispositivos = isAdmin ? data : data.filter((d: Dispositivo) => 
          d.habitacion_id && habitacionesPermitidas.includes(d.habitacion_id)
        );
        
        dispositivos.forEach((dispositivo: Dispositivo) => {
          consumos[dispositivo.id] = Math.floor(Math.random() * (3578 - 7 + 1)) + 7;
        });
        
        setConsumosDispositivos(consumos);
        
        // Calcular top 10 dispositivos con mayor consumo
        const dispositivosOrdenados = [...dispositivos].sort((a: Dispositivo, b: Dispositivo) => 
          consumos[b.id] - consumos[a.id]
        );
        
        const top10 = dispositivosOrdenados.slice(0, 10).map(d => d.id);
        setTop10Ids(top10);
        
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    fetchDispositivos();
    
    // Actualizar consumos y top 10 cada 2 segundos
    const intervalo = setInterval(() => {
      // Actualizar consumos individuales
      setConsumosDispositivos(prev => {
        const nuevosConsumos: {[key: number]: number} = {};
        Object.keys(prev).forEach(id => {
          nuevosConsumos[Number(id)] = Math.floor(Math.random() * (3578 - 7 + 1)) + 7;
        });
        return nuevosConsumos;
      });
      
      // Actualizar top 10 basado en nuevos consumos
      setDispositivos(prevDispositivos => {
        if (prevDispositivos.length === 0) return prevDispositivos;
        
        // Actualizar top 10 sin modificar el array original
        const dispositivosOrdenados = [...prevDispositivos].sort((a, b) => 
          (consumosDispositivos[b.id] || 0) - (consumosDispositivos[a.id] || 0)
        );
        
        setTop10Ids(dispositivosOrdenados.slice(0, 10).map(d => d.id));
        
        return prevDispositivos; // No cambiar los dispositivos, solo su ordenación para el top 10
      });

      // Actualizar consumo/generación total
      setTotalConsumo(prev => {
        const fluctuacion = prev * 0.1 * (Math.random() > 0.5 ? 1 : -1);
        return Math.round(prev + fluctuacion);
      });
    }, 2000);
    
    return () => clearInterval(intervalo);
  }, [habitacionesPermitidas, isAdmin]);

  // Estilos y formateo
  const consumoColor = totalConsumo >= 0 ? '#1ECAFF' : '#00ff00';
  const formattedConsumo = totalConsumo < 1000 && totalConsumo > -1000 
    ? `${Math.abs(totalConsumo)} W` 
    : `${(Math.abs(totalConsumo) / 1000).toFixed(2)} kW`;
  const consumoLabel = totalConsumo >= 0 ? 'Consumiendo de Red' : 'Entregando a la Red';

  const getColorForConsumo = (consumo: number) => {
    return consumo >= 0 ? '#1ECAFF' : '#00ff00'; // Azul para positivos, verde para negativos
  };

  // Ordenar dispositivos por consumo antes de renderizar
  const dispositivosOrdenados = [...dispositivos]
    .sort((a, b) => (consumosDispositivos[b.id] || 0) - (consumosDispositivos[a.id] || 0));

  return (
    <Box className="device-list" sx={{ 
      backgroundColor: '#333', 
      borderRadius: '8px', 
      color: 'white', 
      maxWidth: '300px', 
      height: 'calc(100vh - 85px)', 
      overflowY: 'auto', 
      overflowX: 'hidden', 
      padding: '16px' 
    }}>
      {/* Recuadro modificado con nuevo formato */}
      <Box sx={{ 
        backgroundColor: '#444', 
        borderRadius: '8px', 
        padding: '10px', 
        textAlign: 'center', 
        mb: 1,
        height: 'auto' // Ajuste automático de altura
      }}>
        {/* Primer renglón: texto "Entregando/Consumiendo de Red" en color PERO SIN NEGRITA */}
        <Typography sx={{ 
          fontSize: '0.85rem', 
          fontWeight: 'normal', // Sin negrita
          mb: 0.5,
          color: consumoColor
        }}>
          {consumoLabel}
        </Typography>
        
        {/* Segundo renglón: ícono y valor */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <BoltIcon sx={{ 
            color: consumoColor,
            mr: 0.5 
          }} />
          <Typography sx={{ 
            color: consumoColor, 
            fontSize: '1rem', 
            fontWeight: 'bold' 
          }}>
            {formattedConsumo}
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ backgroundColor: '#444', borderRadius: '8px', padding: '8px', textAlign: 'center', width: '48%' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 'bold' }}>{dispositivosOffline}</Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Offline</Typography>
        </Box>
        <Box sx={{ backgroundColor: '#444', borderRadius: '8px', padding: '8px', textAlign: 'center', width: '48%' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 'bold' }}>{totalDispositivos}</Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Total</Typography>
        </Box>
      </Box>
      
      <List sx={{ padding: 0 }}>
        {dispositivosOrdenados.map((dispositivo, index) => {
          const consumo = consumosDispositivos[dispositivo.id] || 0;
          const formattedConsumo = consumo < 1000 ? `${consumo} W` : `${(consumo / 1000).toFixed(2)} kW`;
          const consumoColor = getColorForConsumo(consumo);
          const isTop10 = index < 10; // Los primeros 10 de la lista ordenada
          
          return (
            <ListItem 
              key={dispositivo.id} 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                py: 0.2, 
                px: 0.5 
              }} 
              className="device-list-item"
            >
              <Typography 
                sx={{ 
                  fontSize: '0.75rem', 
                  mr: 1, 
                  flexShrink: 1, 
                  whiteSpace: 'nowrap', 
                  textOverflow: 'ellipsis', 
                  overflow: 'hidden', 
                  maxWidth: '65%',
                  fontWeight: isTop10 ? 'bold' : 'normal' // Nombre en negrita para top 10
                }}
              >
                {dispositivo.nombre}
              </Typography>
              <Typography 
                sx={{ 
                  fontSize: '0.75rem', 
                  color: consumoColor, 
                  flexShrink: 1, 
                  whiteSpace: 'nowrap', 
                  textOverflow: 'ellipsis', 
                  overflow: 'hidden', 
                  maxWidth: '35%',
                  fontWeight: isTop10 ? 'bold' : 'normal' // Consumo en negrita para top 10
                }}
              >
                {formattedConsumo}
              </Typography>
            </ListItem>
          );
        })}
        
        {dispositivos.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#888' }}>
              No hay dispositivos disponibles
            </Typography>
            {!isAdmin && habitacionesPermitidas.length === 0 && (
              <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1 }}>
                No tienes acceso a ninguna habitación
              </Typography>
            )}
          </Box>
        )}
      </List>
    </Box>
  );
};

export default DeviceList;
