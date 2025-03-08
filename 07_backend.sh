#!/bin/bash

set -e

echo "*****************************************"
echo "*              07_backend               *"
echo "*****************************************"

echo "📦 Iniciando la instalación y configuración del backend..."

# ===========================
# 📁 Directorio del backend
# ===========================

BACKEND_DIR="/opt/shelly_monitoring"
LOG_PATH="$BACKEND_DIR/backend.log"
DISCOVERY_LOG_PATH="/var/log/shelly_discovery.log"

# 📌 Eliminar versiones previas si existen
if [ -d "$BACKEND_DIR/venv" ]; then
    echo "🗑️ Eliminando entorno virtual anterior..."
    rm -rf "$BACKEND_DIR/venv"
fi

if [ -f "$BACKEND_DIR/app.py" ]; then
    echo "🗑️ Eliminando app.py anterior..."
    rm -f "$BACKEND_DIR/app.py"
fi

# 📁 Crear nuevo directorio si no existe
echo "📁 Creando directorio del backend..."
mkdir -p "$BACKEND_DIR"

# ===========================
# 🔧 Creación y activación del entorno virtual
# ===========================

echo "🐍 Creando entorno virtual para Python..."
cd "$BACKEND_DIR"
python3 -m venv venv
source venv/bin/activate

# ===========================
# 📦 Instalar dependencias
# ===========================

echo "📦 Instalando dependencias del backend..."
pip install --upgrade pip
cat > "$BACKEND_DIR/requirements.txt" <<EOF
flask
flask-socketio
flask-sqlalchemy
gunicorn
psycopg2-binary
eventlet
werkzeug
EOF

pip install -r requirements.txt
pip install requests
pip install flask-cors
pip install gunicorn eventlet


# 📌 Crear archivos de log si no existen
echo "📂 Verificando archivos de log..."
sudo touch "$LOG_PATH"
sudo touch "$DISCOVERY_LOG_PATH"
sudo chmod 666 "$LOG_PATH" "$DISCOVERY_LOG_PATH"

# 📌 Asignar permisos adecuados
echo "🔧 Ajustando permisos de logs..."
sudo chown www-data:www-data "$LOG_PATH" "$DISCOVERY_LOG_PATH"
sudo chmod 666 "$LOG_PATH" "$DISCOVERY_LOG_PATH"
sudo chown -R www-data:www-data "$BACKEND_DIR/venv"


# 📌 Asegurar permisos adecuados en logs
echo "🔧 Ajustando permisos en logs..."
sudo chmod 666 /var/log/shelly_discovery.log
sudo chown www-data:www-data /var/log/shelly_discovery.log


# ===========================
# 📝 Creación del archivo app.py
# ===========================

echo "🔧 Configurando la API de Flask en app.py..."
cat > "$BACKEND_DIR/app.py" <<EOF
from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
import os
import logging
import subprocess
import time
from threading import Thread

# Configuración del backend Flask
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
CORS(app)  # Habilita CORS en todas las rutas

# Configuración de PostgreSQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://shelly_user:shelly_pass@localhost:5432/shelly_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Configuración de logs
LOG_PATH = "/opt/shelly_monitoring/backend.log"
logging.basicConfig(filename=LOG_PATH, level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logging.info("🔧 Backend Flask iniciado.")

# Definición de modelos
class User(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Tableros(db.Model):
    __tablename__ = 'tableros'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), unique=True, nullable=False)
    orden = db.Column(db.Integer, nullable=False, default=0)  # Nuevo campo

class Habitaciones(db.Model):
    __tablename__ = 'habitaciones'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), unique=True, nullable=False)
    tablero_id = db.Column(db.Integer, db.ForeignKey('tableros.id'), nullable=False)
    orden = db.Column(db.Integer, nullable=False, default=0)  # Nuevo campo

class Dispositivos(db.Model):
    __tablename__ = 'dispositivos'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    ip = db.Column(db.String(15), unique=True, nullable=False)
    tipo = db.Column(db.String(50), nullable=False)
    habitacion_id = db.Column(db.Integer, db.ForeignKey('habitaciones.id'), nullable=True)
    ultimo_consumo = db.Column(db.Float, default=0)
    estado = db.Column(db.Boolean, default=False)

# Crear base de datos si no existe
with app.app_context():
    db.create_all()
    db.session.commit()  # Asegura que los cambios se reflejen en PostgreSQL

# API: Obtener dispositivos
@app.route('/api/dispositivos', methods=['GET'])
def get_dispositivos():
    dispositivos = Dispositivos.query.all()
    return jsonify([{ "id": d.id, "nombre": d.nombre, "ip": d.ip, "tipo": d.tipo, "habitacion_id": d.habitacion_id, "ultimo_consumo": d.ultimo_consumo, "estado": d.estado } for d in dispositivos])

# API: Cambiar estado de un dispositivo
@app.route('/api/toggle_device/<int:device_id>', methods=['POST'])
def toggle_device(device_id):
    device = Dispositivos.query.get(device_id)
    if device:
        device.estado = not device.estado
        db.session.commit()
        socketio.emit('update_device', {"id": device.id, "estado": device.estado})
        return jsonify({"message": "Estado cambiado"}), 200
    return jsonify({"error": "Dispositivo no encontrado"}), 404

# API: Obtener habitaciones
@app.route('/api/habitaciones', methods=['GET'])
def get_habitaciones():
    habitaciones = Habitaciones.query.all()
    return jsonify([{ "id": h.id, "nombre": h.nombre, "tablero_id": h.tablero_id } for h in habitaciones])

# API: Obtener habitaciones por tablero
@app.route('/api/tableros/<int:tablero_id>/habitaciones', methods=['GET'])
def get_habitaciones_by_tablero(tablero_id):
    habitaciones = Habitaciones.query.filter_by(tablero_id=tablero_id).all()
    return jsonify([{ "id": h.id, "nombre": h.nombre, "tablero_id": h.tablero_id } for h in habitaciones])

# API: Eliminar una habitación
@app.route('/api/habitaciones/<int:habitacion_id>', methods=['DELETE'])
def eliminar_habitacion(habitacion_id):
    habitacion = Habitaciones.query.get(habitacion_id)
    if habitacion:
        db.session.delete(habitacion)
        db.session.commit()
        return jsonify({"message": "Habitación eliminada correctamente"}), 200
    return jsonify({"error": "Habitación no encontrada"}), 404

# API: Crear una nueva habitación dentro de un tablero
@app.route('/api/habitaciones', methods=['POST'])
def crear_habitacion():
    data = request.get_json()
    nombre = data.get("nombre", "").strip()
    tablero_id = data.get("tablero_id")

    if not nombre:
        return jsonify({"error": "El nombre de la habitación no puede estar vacío"}), 400

    if not tablero_id:
        return jsonify({"error": "El ID del tablero es requerido"}), 400

    if Habitaciones.query.filter_by(nombre=nombre, tablero_id=tablero_id).first():
        return jsonify({"error": "Ya existe una habitación con este nombre en este tablero"}), 400

    nueva_habitacion = Habitaciones(nombre=nombre, tablero_id=tablero_id)
    db.session.add(nueva_habitacion)
    db.session.commit()

    return jsonify({
        "id": nueva_habitacion.id,
        "nombre": nueva_habitacion.nombre,
        "tablero_id": nueva_habitacion.tablero_id
    }), 201

# API: Obtener lista de tableros
@app.route('/api/tableros', methods=['GET'])
def get_tableros():
    tableros = Tableros.query.all()
    return jsonify([{ "id": t.id, "nombre": t.nombre } for t in tableros])

# API: Crear un nuevo tablero
@app.route('/api/tableros', methods=['POST'])
def crear_tablero():
    data = request.get_json()
    nombre = data.get("nombre", "").strip()

    if not nombre:
        return jsonify({"error": "El nombre del tablero no puede estar vacío"}), 400

    if Tableros.query.filter_by(nombre=nombre).first():
        return jsonify({"error": "Ya existe un tablero con este nombre"}), 400

    nuevo_tablero = Tableros(nombre=nombre)
    db.session.add(nuevo_tablero)
    db.session.commit()
    
    return jsonify({"id": nuevo_tablero.id, "nombre": nuevo_tablero.nombre}), 201

# API: Eliminar un tablero (solo si no tiene habitaciones dentro)
@app.route("/api/tableros/<int:tablero_id>", methods=["DELETE"])
def eliminar_tablero(tablero_id):
    """ Elimina un tablero si no tiene habitaciones dentro """
    tablero = Tableros.query.get(tablero_id)

    if not tablero:
        return jsonify({"error": "Tablero no encontrado"}), 404

    # Verificar si hay habitaciones dentro del tablero
    habitaciones_en_tablero = Habitaciones.query.filter_by(tablero_id=tablero_id).count()
    
    if habitaciones_en_tablero > 0:
        return jsonify({"error": "No se puede eliminar un tablero con habitaciones dentro"}), 400

    db.session.delete(tablero)
    db.session.commit()
    return jsonify({"message": "Tablero eliminado correctamente"}), 200

# API: Actualizar orden de tableros
@app.route('/api/tableros/orden', methods=['PUT'])
def actualizar_orden_tableros():
    try:
        data = request.get_json()
        for item in data:
            tablero = Tableros.query.get(item['id'])
            if tablero:
                tablero.orden = item['orden']
        db.session.commit()
        return jsonify({"message": "Orden actualizado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API: Actualizar orden de habitaciones dentro de un tablero
@app.route('/api/habitaciones/orden', methods=['PUT'])
def actualizar_orden_habitaciones():
    try:
        data = request.get_json()
        for item in data:
            habitacion = Habitaciones.query.get(item['id'])
            if habitacion:
                habitacion.orden = item['orden']
        db.session.commit()
        return jsonify({"message": "Orden actualizado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===========================
# 🔹 API para iniciar descubrimiento
# ===========================

@app.route('/api/start_discovery', methods=['GET', 'POST'])
def start_discovery():
    try:
        data = request.get_json()
        subredes = data.get("subredes")

        if not subredes or not isinstance(subredes, list):
            return jsonify({"error": "Debe proporcionar una lista de subredes"}), 400

        subredes = [subred.strip() for subred in subredes]
        subredes_str = ",".join(subredes)

        # Escribir en el log que el descubrimiento inició
        with open("/var/log/shelly_discovery.log", "a") as log_file:
            log_file.write(f"\n📢 Descubrimiento iniciado en subredes: {subredes_str}\n")

        # Ejecutar el script de descubrimiento
        command = ["/usr/bin/python3", "/opt/shelly_monitoring/descubrir_shelly.py"] + subredes
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        stdout, stderr = process.communicate()
        
        # Guardar salida en el log
        with open("/var/log/shelly_discovery.log", "a") as log_file:
            if stdout:
                log_file.write(stdout)
            if stderr:
                log_file.write(f"\n⚠️ Error: {stderr}\n")

        return jsonify({"message": "Descubrimiento ejecutado."}), 200

    except Exception as e:
        with open("/var/log/shelly_discovery.log", "a") as log_file:
            log_file.write(f"\n❌ Error en descubrimiento: {str(e)}\n")
        return jsonify({"error": f"Error al ejecutar el descubrimiento: {str(e)}"}), 500

# ===========================
# 📡 Endpoint SSE para transmitir logs en vivo
# ===========================
@app.route('/api/logs')
def stream_logs():
    def generate():
        with open("/var/log/shelly_discovery.log", "r") as log_file:
            log_file.seek(0, 2)  # Ir al final del archivo
            while True:
                line = log_file.readline()
                if line:
                    # Remover la fecha y hora (formato: [YYYY-MM-DD HH:MM:SS])
                    clean_line = line[line.find("]") + 2:] if "]" in line else line
                    yield f"data: {clean_line}\n\n"
                else:
                    time.sleep(1)  # Evita sobrecargar el sistema
    return Response(stream_with_context(generate()), content_type='text/event-stream')

# ===========================
# 🔹 Iniciar backend con HTTPS
# ===========================
if __name__ == '__main__':
    ssl_cert = "/etc/ssl/certs/shelly_monitoring.pem"
    ssl_key = "/etc/ssl/private/shelly_monitoring.key"

    if not os.path.isfile(ssl_cert) or not os.path.isfile(ssl_key):
        logging.error("❌ Error: No se encontraron los certificados SSL en las rutas especificadas.")
        exit(1)

    logging.info(f"📢 Iniciando servidor en 0.0.0.0:8000 con Gunicorn y SSL habilitado.")
    socketio.run(app, host="0.0.0.0", port=8000, certfile=ssl_cert, keyfile=ssl_key)
EOF

# ===========================
# 📝 Creación del archivo wsgi.py para Gunicorn
# ===========================
echo "🔧 Creando archivo wsgi.py para Gunicorn..."
cat > "$BACKEND_DIR/wsgi.py" <<EOF
from app import app, socketio

if __name__ == "__main__":
    socketio.run(app)
EOF


# ===========================
# 🔧 Ajustar permisos de ejecución
# ===========================

sudo chmod +x "$BACKEND_DIR/app.py"

# ===========================
# 🔧 Ajustar permisos de certificados SSL
# ===========================
if [ -f "/etc/ssl/private/shelly_monitoring.key" ]; then
    echo "🔧 Ajustando permisos del certificado SSL..."
#    sudo chmod 755 /etc/ssl/private/shelly_monitoring.key
#    sudo chown root:www-data /etc/ssl/private/shelly_monitoring.key
#    sudo chmod 755 /etc/ssl/certs/shelly_monitoring.pem  
#    sudo chown root:www-data /etc/ssl/certs/shelly_monitoring.pem
    sudo chmod -R 755 /etc/ssl
    sudo chown -R root:www-data /etc/ssl
    sudo chmod 640 /etc/ssl/private/ssl-cert-snakeoil.key
    sudo chown root:ssl-cert /etc/ssl/private/ssl-cert-snakeoil.key
fi


# 📌 Verificar si el script de descubrimiento existe; si no, crearlo vacío
if [ ! -f "/opt/shelly_monitoring/descubrir_shelly.py" ]; then
    echo "⚠️ Script de descubrimiento no encontrado, creando uno vacío..."
    sudo touch /opt/shelly_monitoring/descubrir_shelly.py
fi

sudo chmod +x /opt/shelly_monitoring/descubrir_shelly.py
sudo chown www-data:www-data /opt/shelly_monitoring/descubrir_shelly.py



# ===========================
# 🔧 Configuración del servicio systemd
# ===========================
SERVICE_FILE="/etc/systemd/system/shelly_monitoring.service"

echo "🔧 Configurando servicio systemd..."
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Shelly Monitoring Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/shelly_monitoring
ExecStart=/opt/shelly_monitoring/venv/bin/gunicorn --worker-class eventlet -w 1 \
    --certfile=/etc/ssl/certs/shelly_monitoring.pem \
    --keyfile=/etc/ssl/private/shelly_monitoring.key \
    -b 0.0.0.0:8000 wsgi:app
Restart=always
Environment="PYTHONUNBUFFERED=1"

[Install]
WantedBy=multi-user.target
EOF


# Recargar systemd para aplicar cambios
sudo systemctl daemon-reload

# ===========================
# 🔧 Reiniciar el servicio
# ===========================

echo "🔧 Ajustando permisos y reiniciando servicio shelly_monitoring..."
sudo chown -R www-data:www-data /opt/shelly_monitoring
sudo chmod -R 755 /opt/shelly_monitoring

sudo systemctl restart shelly_monitoring
sleep 2

# Verificar si el servicio se está ejecutando correctamente
if systemctl is-active --quiet shelly_monitoring; then
    echo "✅ Servicio shelly_monitoring está corriendo correctamente."
else
    echo "❌ Error: El servicio shelly_monitoring no se inició correctamente. Verifica los logs con:"
    echo "   sudo journalctl -u shelly_monitoring --no-pager --lines 50"
    exit 1
fi


echo "✅ Instalación y configuración del backend completadas exitosamente."
