import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { getDispositivos } from '../services/api';

const DeviceList = () => {
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [totalDispositivos, setTotalDispositivos] = useState(0);

  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        const data = await getDispositivos();
        setDispositivos(data);
        setTotalDispositivos(data.length);
      } catch (error) {
        console.error('Error al obtener los dispositivos:', error);
      }
    };

    fetchDispositivos();
  }, []);

  const totalConsumo = -12800; // Ejemplo en W (-12.8 kW)
  const consumoColor = totalConsumo >= 0 ? '#1E8FFF' : '#00ff00'; // Verde más intenso y brillante
  const formattedConsumo = totalConsumo < 1000 && totalConsumo > -1000 ? `${totalConsumo} W` : `${(totalConsumo / 1000).toFixed(2)} kW`;
  const consumoLabel = totalConsumo >= 0 ? 'Consumo Total' : 'Generación Total';

  const getColorForConsumo = (consumo: number) => {
    return consumo >= 0 ? '#1E8FFF' : '#00ff00'; // Azul intenso para valores positivos, verde para negativos
  };

  return (
    <Box className="device-list" sx={{ backgroundColor: '#333', borderRadius: '8px', color: 'white', width: '100%', maxWidth: '300px', height: 'calc(100vh - 85px)', overflowY: 'auto', overflowX: 'hidden', padding: '8px', margin: '0 auto', boxSizing: 'border-box' }}>
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
        {dispositivos.map((dispositivo) => {
          const consumo = Math.floor(Math.random() * (3578 - 7 + 1)) + 7; // Valor aleatorio entre 7W y 3578W
          const formattedConsumo = consumo < 1000 ? `${consumo} W` : `${(consumo / 1000).toFixed(2)} kW`;
          const consumoColor = getColorForConsumo(consumo);
          return (
            <ListItem key={dispositivo.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.2, px: 0.5 }} className="device-list-item">
              <Typography sx={{ fontSize: '0.75rem', mr: 1, flexShrink: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '65%' }}>{dispositivo.nombre}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: consumoColor, flexShrink: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '35%' }}>{formattedConsumo}</Typography>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

export default DeviceList;
