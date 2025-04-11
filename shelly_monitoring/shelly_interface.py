import requests
import json
import logging
from typing import Dict, List, Any, Optional, Union
from threading import Thread
import time

# Configurar el logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ShellyInterface:
    """
    Interfaz para comunicarse con el adaptador Shelly.ioAdapter
    """
    def __init__(self, adapter_url: str = "http://localhost:8087"):
        """
        Inicializa la interfaz con la URL del adaptador Shelly.ioAdapter

        Args:
            adapter_url: URL donde está corriendo el adaptador Shelly.ioAdapter
        """
        self.adapter_url = adapter_url
        self.devices = {}
        self.event_listeners = []
        self._start_event_listener()
        logger.info(f"ShellyInterface inicializado con URL: {adapter_url}")

    def _make_request(self, endpoint: str, method: str = "GET", data: dict = None) -> Union[Dict, List, None]:
        """
        Realiza una petición al adaptador Shelly.ioAdapter

        Args:
            endpoint: Endpoint a llamar
            method: Método HTTP (GET, POST, PUT, DELETE)
            data: Datos para enviar en la petición (para POST/PUT)

        Returns:
            La respuesta del adaptador o None si hubo un error
        """
        url = f"{self.adapter_url}/{endpoint}"
        try:
            if method == "GET":
                response = requests.get(url)
            elif method == "POST":
                response = requests.post(url, json=data)
            elif method == "PUT":
                response = requests.put(url, json=data)
            elif method == "DELETE":
                response = requests.delete(url)
            else:
                logger.error(f"Método HTTP no soportado: {method}")
                return None

            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al comunicarse con el adaptador: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Error decodificando respuesta JSON: {e}")
            return None

    def _start_event_listener(self):
        """
        Inicia un thread para escuchar eventos del adaptador
        """
        def event_listener():
            while True:
                try:
                    response = requests.get(f"{self.adapter_url}/api/v1/devices")
                    if response.status_code == 200:
                        devices = response.json()
                        for device in devices:
                            device_id = device.get('id')
                            if device_id:
                                old_device = self.devices.get(device_id)
                                if old_device != device:
                                    self.devices[device_id] = device
                                    self._notify_listeners('deviceUpdate', device)
                except Exception as e:
                    logger.error(f"Error en el event listener: {e}")
                time.sleep(1)

        thread = Thread(target=event_listener, daemon=True)
        thread.start()

    def add_event_listener(self, event_type: str, callback):
        """
        Agrega un listener para eventos del adaptador

        Args:
            event_type: Tipo de evento a escuchar
            callback: Función a llamar cuando ocurra el evento
        """
        self.event_listeners.append((event_type, callback))

    def _notify_listeners(self, event_type: str, data: Any):
        """
        Notifica a todos los listeners registrados para un tipo de evento

        Args:
            event_type: Tipo de evento
            data: Datos del evento
        """
        for listener_type, callback in self.event_listeners:
            if listener_type == event_type:
                try:
                    callback(data)
                except Exception as e:
                    logger.error(f"Error en event listener: {e}")

    def get_devices(self) -> List[Dict[str, Any]]:
        """
        Obtiene la lista de dispositivos Shelly descubiertos por el adaptador

        Returns:
            Lista de dispositivos o lista vacía si hubo un error
        """
        endpoint = "api/v1/devices"
        result = self._make_request(endpoint)
        if result is None:
            return []
        return result

    def discover_devices(self) -> bool:
        """
        Inicia un escaneo para descubrir dispositivos Shelly en la red

        Returns:
            True si se inició el descubrimiento correctamente, False en caso contrario
        """
        endpoint = "api/v1/discover"
        result = self._make_request(endpoint, method="POST")
        return result is not None

    def get_device_info(self, device_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtiene información detallada de un dispositivo específico

        Args:
            device_id: ID del dispositivo Shelly

        Returns:
            Información del dispositivo o None si hubo un error
        """
        endpoint = f"api/v1/devices/{device_id}"
        return self._make_request(endpoint)

    def control_device(self, device_id: str, channel: int, state: bool) -> bool:
        """
        Controla un dispositivo Shelly (encender/apagar)

        Args:
            device_id: ID del dispositivo Shelly
            channel: Canal a controlar (generalmente 0 para el primero)
            state: True para encender, False para apagar

        Returns:
            True si se controló correctamente, False en caso contrario
        """
        endpoint = f"api/v1/devices/{device_id}/relay/{channel}"
        data = {"turn": "on" if state else "off"}
        result = self._make_request(endpoint, method="POST", data=data)
        return result is not None

    def get_device_status(self, device_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtiene el estado actual de un dispositivo

        Args:
            device_id: ID del dispositivo Shelly

        Returns:
            Estado del dispositivo o None si hubo un error
        """
        endpoint = f"api/v1/devices/{device_id}/status"
        return self._make_request(endpoint)

    def check_firmware_updates(self, device_id: str) -> Optional[Dict[str, Any]]:
        """
        Verifica si hay actualizaciones de firmware disponibles para un dispositivo

        Args:
            device_id: ID del dispositivo Shelly

        Returns:
            Información sobre actualizaciones disponibles o None si hubo un error
        """
        endpoint = f"api/v1/devices/{device_id}/firmware"
        return self._make_request(endpoint)

    def update_firmware(self, device_id: str) -> bool:
        """
        Inicia la actualización de firmware para un dispositivo

        Args:
            device_id: ID del dispositivo Shelly

        Returns:
            True si se inició la actualización correctamente, False en caso contrario
        """
        endpoint = f"api/v1/devices/{device_id}/firmware/update"
        result = self._make_request(endpoint, method="POST")
        return result is not None

    def check_device_online(self, device_id: str) -> bool:
        """
        Verifica si un dispositivo está en línea

        Args:
            device_id: ID del dispositivo Shelly

        Returns:
            True si el dispositivo está en línea, False en caso contrario
        """
        device_status = self.get_device_status(device_id)
        if device_status is None:
            return False
        return device_status.get("online", False)

    def get_device_energy_data(self, device_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtiene datos de consumo energético para dispositivos compatibles

        Args:
            device_id: ID del dispositivo Shelly

        Returns:
            Datos de consumo energético o None si no está disponible o hubo un error
        """
        device_status = self.get_device_status(device_id)
        if device_status is None:
            return None
        
        # Extraer datos de energía si están disponibles
        energy_data = {}
        if "meters" in device_status:
            energy_data["meters"] = device_status["meters"]
        
        return energy_data if energy_data else None
