// Importaciones primero
import dimmer2Image from '../pictures/DIMMER2.png';
import em3Image from '../pictures/EM3.png';
import emImage from '../pictures/EM.png';
import plus1pmImage from '../pictures/PLUS1PM.png';
import plus1Image from '../pictures/PLUS1.png';
import plus2pmImage from '../pictures/PLUS2PM.png';
import pro1pmImage from '../pictures/PRO1PM.png';
import proem50Image from '../pictures/PROEM50.png';

// Constantes para dimensiones y animaciones
export const CARD_WIDTH = 264;
export const CARD_HEIGHT = 55;
export const CARD_MARGIN = 4;
export const TOTAL_CARD_WIDTH = CARD_WIDTH + (CARD_MARGIN * 2);
export const TOTAL_CARD_HEIGHT = CARD_HEIGHT + (CARD_MARGIN * 2);
export const POWER_BUTTON_SIZE = 39;
export const CIRCLE_SIZE = 45;
export const ANIMATION_DURATION = 0.3;

// Mapa de imágenes para tipos de dispositivos
export const deviceTypeImages: {[key: string]: string} = {
  'DIMMER2': dimmer2Image,
  'EM3': em3Image,
  'EM': emImage,
  'PLUS1PM': plus1pmImage,
  'PLUS1': plus1Image,
  'PLUS2PM': plus2pmImage,
  'PRO1PM': pro1pmImage,
  'PROEM50': proem50Image,
};

export const defaultImage = plus1Image;

// Nuevas constantes para estados de conexión
export const CONNECTION_COLORS = {
  connected: '#4CAF50',   // Verde
  disconnected: '#FF9800', // Naranja
  error: '#F44336'        // Rojo
};

// Duración de las notificaciones de conexión
export const CONNECTION_NOTIFICATION_DURATION = 6000; // 6 segundos

// Estilos globales para animaciones y scrollbars
export const scrollbarStyle = `
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

export const globalStyles = `
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

  /* Animaciones para indicador de conexión */
  @keyframes pulseConnected {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
  }

  @keyframes pulseDisconnected {
    0% { opacity: 0.7; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
    100% { opacity: 0.7; transform: scale(1); }
  }

  .connection-indicator-connected {
    animation: pulseConnected 2s infinite ease-in-out;
  }

  .connection-indicator-disconnected {
    animation: pulseDisconnected 1.5s infinite ease-in-out;
  }

  .connection-indicator-error {
    animation: pulseDisconnected 0.8s infinite ease-in-out;
  }

  ${scrollbarStyle}

  /* Optimización para las tarjetas */
  .device-card {
    contain: content;
    will-change: transform;
  }

  /* Estilos para notificación de conexión */
  .connection-notification {
    position: fixed;
    bottom: 10px;
    left: 10px;
    padding: 6px 16px;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    z-index: 9999;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  .connection-notification-icon {
    margin-right: 8px;
  }
`;
