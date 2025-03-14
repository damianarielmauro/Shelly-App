import React, { useState, useEffect } from 'react';
import { getDispositivos, toggleDevice } from '../services/api';
import { List, ListItem, ListItemText, Button, ListItemSecondaryAction } from '@mui/material';
import { checkPermission } from '../services/auth';

interface DeviceListProps {
  user: {
    permissions: string[];
  };
}

const DeviceList: React.FC<DeviceListProps> = ({ user }) => {
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        const data = await getDispositivos();
        setDispositivos(data);
      } catch (error) {
        setError('Error al obtener dispositivos');
      } finally {
        setLoading(false);
      }
    };

    fetchDispositivos();
  }, []);

  const handleToggle = async (deviceId: number) => {
    if (!checkPermission(user, 'toggle_device')) {
      alert('No tienes permiso para cambiar el estado de los dispositivos.');
      return;
    }
    try {
      await toggleDevice(deviceId);
      const data = await getDispositivos();
      setDispositivos(data);
    } catch (error) {
      setError('Error al cambiar el estado del dispositivo');
    }
  };

  if (loading) {
    return <p>Cargando dispositivos...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <List sx={{ backgroundColor: '#333', color: 'white' }}>
      {dispositivos.map((dispositivo) => (
        <ListItem key={dispositivo.id} sx={{ borderBottom: '1px solid #444' }}>
          <ListItemText primary={dispositivo.nombre} secondary={`Estado: ${dispositivo.estado ? 'Encendido' : 'Apagado'}`} />
          <ListItemSecondaryAction>
            <Button
              variant="contained"
              color={dispositivo.estado ? 'secondary' : 'primary'}
              onClick={() => handleToggle(dispositivo.id)}
            >
              {dispositivo.estado ? 'Apagar' : 'Encender'}
            </Button>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
};

export default DeviceList;
