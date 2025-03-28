import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import {
  DispositivoConConsumo,
  obtenerDispositivosConConsumo,
  obtenerDispositivosHabitacionConConsumo,
  obtenerHabitacionesConConsumo,
  HabitacionConConsumo,
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
  selectedHabitacion?: number | null;
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
  const [habitacionSeleccionadaData, setHabitacionSeleccionadaData] = useState<HabitacionConConsumo | null>(null);

  // Determinar si debemos mostrar los dispositivos de una habitación específica
  const mostrarDispositivosHabitacion = !roomMatrixView && selectedHabitacion !== null;

  useEffect(() => {
    // Iniciar el servicio de actualización periódica
    iniciarActualizacionPeriodica();

    // Función para cargar habitación seleccionada (si estamos en ese modo)
    const cargarHabitacionSeleccionada = async () => {
      if (mostrarDispositivosHabitacion && selectedHabitacion) {
        try {
          const habitaciones = await obtenerHabitacionesConConsumo();
          const habitacion = habitaciones.find(h => h.id === selectedHabitacion) || null;
          setHabitacionSeleccionadaData(habitacion);
        } catch (error) {
          console.error('Error al cargar información de habitación:', error);
        }
      } else {
        setHabitacionSeleccionadaData(null);
      }
    };

    // Función para cargar dispositivos y calcular consumo total
    const cargarDispositivos = async () => {
      try {
        let dispositivosData: DispositivoConConsumo[] = [];
        let consumoTotal = 0;

        if (mostrarDispositivosHabitacion && selectedHabitacion) {
          // Cargar dispositivos de la habitación seleccionada con un refresco forzado
          dispositivosData = await obtenerDispositivosHabitacionConConsumo(selectedHabitacion, true);
          
          // Calcular consumo total de estos dispositivos
          consumoTotal = dispositivosData.reduce((total, dispositivo) => total + dispositivo.consumo, 0);
          
          // También actualizar información de la habitación
          await cargarHabitacionSeleccionada();
        } else {
          // Cargar todos los dispositivos
          dispositivosData = await obtenerDispositivosConConsumo();
          
          // Filtrar según permisos si no es admin
          if (!isAdmin) {
            dispositivosData = dispositivosData.filter(d => 
              d.habitacion_id && habitacionesPermitidas.includes(d.habitacion_id)
            );
          }
          
          // En vista global, usar el consumo total del sistema
          consumoTotal = obtenerConsumoTotal();
        }

        setDispositivos(dispositivosData);
        setTotalDispositivos(dispositivosData.length);
        setTotalConsumo(consumoTotal);

        // Actualizar top 10 IDs
        setTop10Ids(obtenerTop10Ids().filter(id => 
          dispositivosData.some(d => d.id === id)
        ));
      } catch (error) {
        console.error('Error al cargar dispositivos:', error);
      }
    };

    // Cargar datos iniciales
    cargarDispositivos();
    cargarHabitacionSeleccionada();

    // Suscribirse a actualizaciones según el contexto
    let unsuscribir: () => void;
    
    if (mostrarDispositivosHabitacion && selectedHabitacion) {
      // En vista de habitación, suscribirse a cambios de dispositivos de esa habitación
      unsuscribir = suscribirseADispositivosHabitacionActualizados(
        selectedHabitacion, 
        async () => {
          await cargarDispositivos();
          await cargarHabitacionSeleccionada();
        }
      );
    } else {
      // En vista global, suscribirse a cambios globales
      const unsuscribirDispositivos = suscribirseADispositivosActualizados(cargarDispositivos);
      const unsuscribirConsumoTotal = suscribirseAConsumoTotalActualizado(() => {
        if (!mostrarDispositivosHabitacion) {
          setTotalConsumo(obtenerConsumoTotal());
        }
      });
      
      unsuscribir = () => {
        unsuscribirDispositivos();
        unsuscribirConsumoTotal();
      };
    }

    return () => {
      if (unsuscribir) unsuscribir();
    };
  }, [habitacionesPermitidas, isAdmin, selectedHabitacion, mostrarDispositivosHabitacion]);

  // Determinar la etiqueta y color según el contexto
  const consumoColor = getColorForConsumo(totalConsumo);
  const formattedConsumo = formatearConsumo(totalConsumo);
  const consumoLabel = mostrarDispositivosHabitacion 
    ? habitacionSeleccionadaData?.nombre || "Habitación"
    : (totalConsumo >= 0 ? 'Consumiendo de Red' : 'Entregando a la Red');

  // Ordenar dispositivos por consumo absoluto (mayor a menor)
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
        {/* Primer renglón: nombre de habitación o estado de red */}
        <Typography sx={{ 
          fontSize: '0.85rem', 
          fontWeight: mostrarDispositivosHabitacion ? 'bold' : 'normal', // Con negrita si es nombre de habitación
          mb: 0.5,
          color: consumoColor
        }}>
          {consumoLabel}
        </Typography>
        
        {/* Segundo renglón: ícono y valor de consumo */}
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
        {dispositivosOrdenados.map((dispositivo) => {
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
