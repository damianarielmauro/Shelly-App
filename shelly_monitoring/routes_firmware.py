import requests
from flask import Blueprint, jsonify, request
import logging
from shelly_interface import ShellyInterface

# Inicializar blueprint para rutas de firmware
firmware_bp = Blueprint('firmware', __name__, url_prefix='/api/shelly')

# Inicializar el logger
logger = logging.getLogger(__name__)

# Inicializar la interfaz Shelly
shelly_interface = ShellyInterface()

@firmware_bp.route('/firmware_global', methods=['GET'])
def get_firmware_global():
    """Obtiene información de firmware de todos los modelos desde la API global de Shelly"""
    try:
        response = requests.get('https://api.shelly.cloud/files/firmware')
        return jsonify(response.json())
    except Exception as e:
        logger.error(f"Error al obtener firmware global: {str(e)}")
        return jsonify({"error": str(e)}), 500

@firmware_bp.route('/firmware_check_global', methods=['GET'])
def check_firmware_global():
    """Verifica actualizaciones para un modelo específico en la API global"""
    model = request.args.get('model', '').lower()
    
    if not model:
        return jsonify({"error": "Se requiere parámetro 'model'"}), 400
    
    try:
        response = requests.get('https://api.shelly.cloud/files/firmware')
        data = response.json()
        
        # Normalizar el nombre del modelo para la comparación
        firmware_data = None
        
        # Buscar el modelo en los datos de firmware (probar diferentes formatos)
        for key in data.get('data', {}):
            if key.lower() == model or key.lower() == "shelly" + model:
                firmware_data = data['data'][key]
                break
        
        if not firmware_data:
            return jsonify({"error": f"No se encontró información para el modelo {model}"}), 404
        
        # Extraer información relevante
        current_version = "0.0.0"  # Se debería obtener desde el dispositivo
        new_version = firmware_data.get('version', '')
        
        # Extraer la versión semántica de la cadena completa
        # Formato típico: 20201124-091508/v1.9.4@57ac4ad8
        new_version_sem = new_version.split('/v')[1].split('@')[0] if '/v' in new_version else new_version
        
        return jsonify({
            "model": model,
            "current_version": current_version,
            "new_version": new_version_sem,
            "url": firmware_data.get('url', ''),
            "release_date": firmware_data.get('release_date', ''),
            "release_notes": firmware_data.get('notes', 'No hay notas disponibles para esta versión.')
        })
        
    except Exception as e:
        logger.error(f"Error al verificar firmware para modelo {model}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@firmware_bp.route('/devices/<device_id>/ota/check', methods=['GET'])
def device_firmware_check(device_id):
    """Verifica directamente con el dispositivo si hay actualizaciones disponibles"""
    try:
        # Obtener información del dispositivo para conocer su IP
        device_info = shelly_interface.get_device_info(device_id)
        if not device_info:
            return jsonify({"error": "Dispositivo no encontrado"}), 404
        
        # Usar la IP del dispositivo para consultar su endpoint de OTA
        ip = device_info.get('ip')
        if not ip:
            return jsonify({"error": "IP del dispositivo no disponible"}), 400
        
        # Consultar directamente al dispositivo
        response = requests.get(f"http://{ip}/ota/check", timeout=5)
        return jsonify(response.json())
    except Exception as e:
        logger.error(f"Error al verificar firmware para dispositivo {device_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@firmware_bp.route('/devices/<device_id>/firmware/update', methods=['POST'])
def update_device_firmware(device_id):
    """Inicia la actualización de firmware para un dispositivo"""
    try:
        # Obtener información del dispositivo para conocer su IP
        device_info = shelly_interface.get_device_info(device_id)
        if not device_info:
            return jsonify({"error": "Dispositivo no encontrado"}), 404
        
        # Usar la IP del dispositivo para enviar la orden de actualización
        ip = device_info.get('ip')
        if not ip:
            return jsonify({"error": "IP del dispositivo no disponible"}), 400
        
        # Obtener URL del firmware si se ha proporcionado
        data = request.json or {}
        firmware_url = data.get('url')
        
        if firmware_url:
            # Actualizar con una URL específica
            payload = {"url": firmware_url}
            response = requests.post(f"http://{ip}/ota/update", json=payload, timeout=5)
        else:
            # Actualizar usando el servidor de Shelly (por defecto)
            response = requests.post(f"http://{ip}/ota/update", timeout=5)
            
        return jsonify(response.json())
    except Exception as e:
        logger.error(f"Error al actualizar firmware para dispositivo {device_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Registrar este blueprint en app.py
# from routes_firmware import firmware_bp
# app.register_blueprint(firmware_bp)
