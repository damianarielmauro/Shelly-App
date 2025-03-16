from flask import Flask, jsonify, request, Response, stream_with_context, redirect, url_for, session
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
import bcrypt
import jwt
import os
import logging
import subprocess
import time
from threading import Thread
import functools

# Configuración del backend Flask
app = Flask(__name__)
app.secret_key = os.urandom(24)  # Llave secreta para manejar sesiones
jwt_secret_key = os.environ.get('JWT_SECRET_KEY', 'your_jwt_secret_key')  # Llave secreta para JWT
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Habilita CORS en todas las rutas con configuración explícita

# Configuración de PostgreSQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://shelly_user:shelly_pass@localhost:5432/shelly_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Configuración de logs
LOG_PATH = "/opt/shelly_monitoring/backend.log"
logging.basicConfig(filename=LOG_PATH, level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")
logging.info("🔧 Backend Flask iniciado.")

# Diccionario de roles y permisos
roles_permissions = {
    'admin': [
        'view_devices', 'toggle_device', 'view_rooms', 'create_room', 'delete_room',
        'view_boards', 'create_board', 'delete_board', 'update_board_order',
        'update_room_order', 'start_discovery', 'view_logs', 'edit_dashboard',
        'create_user', 'create_tablero', 'delete_dashboard', 'delete_habitacion',
        'create_habitacion', 'rename_tablero', 'stream_logs', 'view_statistics', 'delete_habitacion'
    ],
    'user': ['view_devices', 'toggle_device', 'view_rooms']
}

# Middleware para proteger rutas
def require_login(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.path.startswith('/api/login') and not request.path.startswith('/static'):
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                try:
                    decoded_token = jwt.decode(token, jwt_secret_key, algorithms=['HS256'])
                    user_id = decoded_token['user_id']
                    session['user_id'] = user_id
                    session['logged_in'] = True
                except jwt.ExpiredSignatureError:
                    return jsonify({"error": "Token ha expirado"}), 401
                except jwt.InvalidTokenError:
                    return jsonify({"error": "Token inválido"}), 401
            else:
                return jsonify({"error": "Usuario no autenticado"}), 401
        return f(*args, **kwargs)
    return decorated_function

# Middleware para verificar permisos basado en roles
def require_permission(permission):
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = session.get('user_id')
            if not user_id:
                return jsonify({"error": "Usuario no autenticado"}), 401
            user = User.query.get(user_id)
            if not user or permission not in roles_permissions.get(user.role, []):
                return jsonify({"error": "Permiso denegado"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Definición de modelos
class User(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    nombre = db.Column(db.String(100), nullable=False)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

class Tableros(db.Model):
    __tablename__ = 'tableros'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), unique=True, nullable=False)
    orden = db.Column(db.Integer, nullable=False, default=0)

class Habitaciones(db.Model):
    __tablename__ = 'habitaciones'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), unique=True, nullable=False)
    tablero_id = db.Column(db.Integer, db.ForeignKey('tableros.id'), nullable=False)
    orden = db.Column(db.Integer, nullable=False, default=0)

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
    db.session.commit()

# API: Login
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    logging.debug(f"Intento de inicio de sesión: {email}")

    user = User.query.filter_by(email=email).first()
    if user:
        logging.debug("Usuario encontrado en la base de datos")
        if user.check_password(password):
            logging.debug("Contraseña correcta")
            # Generar token JWT
            token = jwt.encode({'user_id': user.id}, jwt_secret_key, algorithm='HS256')
            session['user_id'] = user.id
            session['logged_in'] = True

            # Obtener permisos del rol del usuario
            role_permissions = roles_permissions.get(user.role, [])

            return jsonify({
                "message": "Login exitoso",
                "token": token,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role,
                    "permissions": role_permissions
                }
            }), 200
        else:
            logging.debug("Contraseña incorrecta")
    else:
        logging.debug("Usuario no encontrado")
    return jsonify({"error": "Usuario o contraseña incorrectos"}), 401

# Endpoint para obtener permisos de un rol
@app.route('/api/roles/<role>/permissions', methods=['GET'])
@require_login
def get_role_permissions(role):
    permissions = roles_permissions.get(role, [])
    return jsonify({"permissions": permissions})

# API: Obtener dispositivos
@app.route('/api/dispositivos', methods=['GET'])
@require_permission('view_devices')
def get_dispositivos():
    dispositivos = Dispositivos.query.all()
    return jsonify([{ "id": d.id, "nombre": d.nombre, "ip": d.ip, "tipo": d.tipo, "habitacion_id": d.habitacion_id, "ultimo_consumo": d.ultimo_consumo, "estado": d.estado } for d in dispositivos])

# API: Cambiar estado de un dispositivo
@app.route('/api/toggle_device/<int:device_id>', methods=['POST'])
@require_permission('toggle_device')
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
@require_permission('view_rooms')
def get_habitaciones():
    habitaciones = Habitaciones.query.all()
    return jsonify([{ "id": h.id, "nombre": h.nombre, "tablero_id": h.tablero_id } for h in habitaciones])

# API: Obtener habitaciones por tablero
@app.route('/api/tableros/<int:tablero_id>/habitaciones', methods=['GET'])
@require_permission('view_rooms')
def get_habitaciones_by_tablero(tablero_id):
    habitaciones = Habitaciones.query.filter_by(tablero_id=tablero_id).all()
    return jsonify([{ "id": h.id, "nombre": h.nombre, "tablero_id": h.tablero_id } for h in habitaciones])

# API: Eliminar una habitación
@app.route('/api/habitaciones/<int:habitacion_id>', methods=['DELETE'])
@require_permission('delete_room')
def eliminar_habitacion(habitacion_id):
    habitacion = Habitaciones.query.get(habitacion_id)
    if habitacion:
        db.session.delete(habitacion)
        db.session.commit()
        return jsonify({"message": "Habitación eliminada correctamente"}), 200
    return jsonify({"error": "Habitación no encontrada"}), 404

# API: Crear una nueva habitación dentro de un tablero
@app.route('/api/habitaciones', methods=['POST'])
@require_permission('create_room')
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
@require_permission('view_boards')
def get_tableros():
    tableros = Tableros.query.all()
    return jsonify([{ "id": t.id, "nombre": t.nombre } for t in tableros])

# API: Crear un nuevo tablero
@app.route('/api/tableros', methods=['POST'])
@require_permission('create_board')
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
@require_permission('delete_board')
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
@require_permission('update_board_order')
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
@require_permission('update_room_order')
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
# API: Iniciar descubrimiento
# ===========================
@app.route('/api/start_discovery', methods=['GET', 'POST'])
@require_permission('start_discovery')
def start_discovery():
    try:
        data = request.get_json()
        subredes = data.get("subredes")

        if not subredes or not isinstance(subredes, list):
            return jsonify({"error": "Debe proporcionar una lista de subredes"}), 400

        subredes = [subred.strip() for subred in subredes]
        subredes_str = ",".join(subredes)

        with open("/var/log/shelly_discovery.log", "a") as log_file:
            log_file.write(f"\n📢 Descubrimiento iniciado en subredes: {subredes_str}\n")

        command = ["/usr/bin/python3", "/opt/shelly_monitoring/descubrir_shelly.py"] + subredes
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        stdout, stderr = process.communicate()
        
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

# API: Transmitir logs en vivo
@app.route('/api/logs')
@require_permission('view_logs')
def stream_logs():
    def generate():
        with open("/var/log/shelly_discovery.log", "r") as log_file:
            log_file.seek(0, 2)
            while True:
                line = log_file.readline()
                if line:
                    clean_line = line[line.find("]") + 2:] if "]" in line else line
                    yield f"data: {clean_line}\n\n"
                else:
                    time.sleep(1)
    return Response(stream_with_context(generate()), content_type='text/event-stream')

# API: Crear un nuevo usuario
@app.route('/api/usuarios', methods=['POST'])
@require_permission('create_user')
def crear_usuario():
    data = request.get_json()
    logging.debug(f"Datos recibidos para crear usuario: {data}")
    username = data.get('nombre')
    email = data.get('email')
    password = data.get('password')
    role = data.get('rol')

    if not username or not email or not password or not role:
        logging.debug("Faltan campos obligatorios")
        return jsonify({"error": "Todos los campos son obligatorios"}), 400

    if User.query.filter_by(email=email).first() or User.query.filter_by(username=username).first():
        logging.debug("El nombre de usuario o el correo electrónico ya están en uso")
        return jsonify({"error": "El nombre de usuario o el correo electrónico ya están en uso"}), 400

    try:
        new_user = User(username=username, email=email, role=role, nombre=username)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        logging.debug(f"Usuario creado: {new_user}")

        return jsonify({"message": "Usuario creado correctamente", "user": {"id": new_user.id, "username": new_user.username, "email": new_user.email, "role": new_user.role}}), 201
    except Exception as e:
        logging.error(f"Error al crear el usuario: {str(e)}")
        return jsonify({"error": f"Error al crear el usuario: {str(e)}"}), 500

# Iniciar backend con HTTPS
if __name__ == '__main__':
    ssl_cert = "/etc/ssl/certs/shelly_monitoring.pem"
    ssl_key = "/etc/ssl/private/shelly_monitoring.key"

    if not os.path.isfile(ssl_cert) or not os.path.isfile(ssl_key):
        logging.error("❌ Error: No se encontraron los certificados SSL en las rutas especificadas.")
        exit(1)

    logging.info(f"📢 Iniciando servidor en 0.0.0.0:8000 con SSL habilitado.")
    context = (ssl_cert, ssl_key)
    app.run(host="0.0.0.0", port=8000, ssl_context=context)
