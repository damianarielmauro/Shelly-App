import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import {
  DispositivoConConsumo,
  obtenerDispositivosConConsumo,
  obtenerDispositivosHabitacionConConsumo,
  obtenerTop10Ids,
  obtenerConsumoTotal,
  formatearConsumo,
  getColorForConsumo,
  iniciarActualizacionPeriodica,
  suscribirseADispositivosActualizados,
  suscribirseAConsumoTotalActualizado,
  suscribirseADispositivosHabitacionActualizados
} from '../services/consumptionService';

interface DeviceListProps {
  habitacionesPermitidas: number[];
  isAdmin?: boolean;
  selectedHabitacion?: { id: number; nombre: string } | null;
  roomMatrixView: boolean;
}

const DeviceList: React.FC<DeviceListProps> = ({ 
  habitacionesPermitidas, 
  isAdmin = false,
  selectedHabitacion = null,
  roomMatrixView
}) => {
  const [dispositivos, setDispositivos] = useState<DispositivoConConsumo[]>([]);
  const [totalDispositivos, setTotalDispositivos] = useState(0);
  const [dispositivosOffline, setDispositivosOffline] = useState(4); // Valor ejemplo
  const [totalConsumo, setTotalConsumo] = useState(0);
  const [top10Ids, setTop10Ids] = useState<number[]>([]);

  // Determinar si debemos mostrar los dispositivos de una habitación específica
  const mostrarDispositivosHabitacion = !roomMatrixView && selectedHabitacion !== null;

  useEffect(() => {
    // Iniciar el servicio de actualización periódica
    iniciarActualizacionPeriodica();

    // Función para cargar dispositivos según el contexto (global o habitación específica)
    const cargarDispositivos = async () => {
      try {
        let dispositivosData: DispositivoConConsumo[] = [];

        if (mostrarDispositivosHabitacion && selectedHabitacion) {
          // Cargar dispositivos de la habitación seleccionada
          dispositivosData = await obtenerDispositivosHabitacionConConsumo(selectedHabitacion.id);
        } else {
          // Cargar todos los dispositivos con filtros según permisos
          dispositivosData = await obtenerDispositivosConConsumo();
          
          if (!isAdmin) {
            // Filtrar por habitaciones permitidas para usuarios no admin
            dispositivosData = dispositivosData.filter(d => 
              d.habitacion_id && habitacionesPermitidas.includes(d.habitacion_id)
            );
          }
        }

        setDispositivos(dispositivosData);
        setTotalDispositivos(dispositivosData.length);

        // Actualizar top 10
        const top10 = obtenerTop10Ids().filter(id => 
          dispositivosData.some(d => d.id === id)
        );
        setTop10Ids(top10);

        // En vista de habitación, calcular consumo total como suma de dispositivos
        if (mostrarDispositivosHabitacion) {
          const suma = dispositivosData.reduce((total, d) => total + d.consumo, 0);
          setTotalConsumo(suma);
        } else {
          // En vista global, obtener consumo total del sistema
          setTotalConsumo(obtenerConsumoTotal());
        }
      } catch (error) {
        console.error('Error al cargar dispositivos:', error);
      }
    };

    // Cargar datos iniciales
    cargarDispositivos();

    // Suscribirse a las actualizaciones según el modo de visualización
    let unsuscribir: () => void;
    
    if (mostrarDispositivosHabitacion && selectedHabitacion) {
      // En vista de habitación, suscribirse a cambios de esa habitación
      unsuscribir = suscribirseADispositivosHabitacionActualizados(
        selectedHabitacion.id,
        cargarDispositivos
      );
    } else {
      // En vista global, suscribirse a todos los cambios
      const unsuscribirDispositivos = suscribirseADispositivosActualizados(cargarDispositivos);
      const unsuscribirConsumoTotal = suscribirseAConsumoTotalActualizado(() => {
        setTotalConsumo(obtenerConsumoTotal());
      });
      
      unsuscribir = () => {
        unsuscribirDispositivos();
        unsuscribirConsumoTotal();
      };
    }

    return unsuscribir;
  }, [habitacionesPermitidas, isAdmin, selectedHabitacion, mostrarDispositivosHabitacion]);

  // Etiqueta diferente dependiendo si estamos en vista normal o de habitación
  const consumoLabel = mostrarDispositivosHabitacion 
    ? selectedHabitacion?.nombre || "Habitación" 
    : (totalConsumo >= 0 ? 'Consumiendo de Red' : 'Entregando a la Red');

  // Ordenar dispositivos por consumo antes de renderizar
  const dispositivosOrdenados = [...dispositivos]
    .sort((a, b) => Math.abs(b.consumo) - Math.abs(a.consumo));

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
        {/* Primer renglón: nombre de la habitación o estado global */}
        <Typography sx={{ 
          fontSize: '0.85rem', 
          fontWeight: mostrarDispositivosHabitacion ? 'bold' : 'normal', // Con negrita si es nombre de habitación
          mb: 0.5,
          color: getColorForConsumo(totalConsumo)
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
            color: getColorForConsumo(totalConsumo),
            mr: 0.5 
          }} />
          <Typography sx={{ 
            color: getColorForConsumo(totalConsumo), 
            fontSize: '1rem', 
            fontWeight: 'bold' 
          }}>
            {formatearConsumo(totalConsumo)}
          </Typography>
        </Box>
      </Box>
      
      {/* Mostrar los recuadros de total y offline solo si no estamos en vista de habitación */}
      {!mostrarDispositivosHabitacion && (
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
      )}
      
      <List sx={{ padding: 0 }}>
        {dispositivosOrdenados.map((dispositivo, index) => {
          const isTop10 = top10Ids.includes(dispositivo.id);
          
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
                  color: getColorForConsumo(dispositivo.consumo), 
                  flexShrink: 1, 
                  whiteSpace: 'nowrap', 
                  textOverflow: 'ellipsis', 
                  overflow: 'hidden', 
                  maxWidth: '35%',
                  fontWeight: isTop10 ? 'bold' : 'normal' // Consumo en negrita para top 10
                }}
              >
                {formatearConsumo(dispositivo.consumo)}
              </Typography>
            </ListItem>
          );
        })}
        
        {dispositivos.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#888' }}>
              No hay dispositivos disponibles
            </Typography>
            {!isAdmin && habitacionesPermitidas.length === 0 && !mostrarDispositivosHabitacion && (
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
