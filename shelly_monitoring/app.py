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
from shelly_interface import ShellyInterface

# Inicializar interfaz Shelly
shelly_interface = ShellyInterface()


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
logging.basicConfig(
    filename=LOG_PATH, 
    level=logging.DEBUG, 
    format="%(asctime)s - %(levelname)s - %(message)s"  # Asegúrate de que el formato sea correcto
)
logging.getLogger().setLevel(logging.DEBUG)
logging.info("🔧 Backend Flask iniciado.")

# Diccionario de roles y permisos
roles_permissions = {
    'admin': [
        'view_devices', 'toggle_device', 'view_rooms', 'create_room', 'delete_room',
        'view_boards', 'create_board', 'delete_board', 'update_board_order',
        'update_room_order', 'start_discovery', 'view_logs', 'edit_dashboard',
        'create_user', 'create_tablero', 'delete_dashboard', 'delete_habitacion',
        'create_habitacion', 'rename_tablero', 'stream_logs', 'view_statistics', 'delete_habitacion',
        'discover_devices', 'manage_users', 'view_consumption', 'update_device_order', 'control_devices', 'manage_devices'
    ],
    'user': ['view_devices', 'toggle_device', 'view_rooms']
}

# Middleware para proteger rutas
def require_jwt(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        token = request.args.get('token')  # Obtener el token de la URL para SSE

        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        elif not token:
            return jsonify({"error": "Usuario no autenticado"}), 401

        try:
            decoded_token = jwt.decode(token, jwt_secret_key, algorithms=['HS256'])
            request.user_id = decoded_token['user_id']  # Almacena el user_id en el request
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token ha expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token inválido"}), 401

        return f(*args, **kwargs)
    return decorated_function

# Middleware para verificar permisos basado en roles
def require_permission(permission):
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = getattr(request, 'user_id', None)
            logging.debug(f"Verificando permisos para el usuario: {user_id}")
            if not user_id:
                logging.debug("Usuario no autenticado: request.user_id devolvió None")
                return jsonify({"error": "Usuario no autenticado"}), 401
            user = User.query.get(user_id)
            logging.debug(f"Permisos del usuario: {user.role if user else 'No user found'}")
            if not user or permission not in roles_permissions.get(user.role, []):
                logging.debug(f"Permiso denegado para la acción: {permission}")
                return jsonify({"error": "Permiso denegado"}), 403
            logging.debug(f"Permiso concedido para la acción: {permission}")
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
    orden = db.Column(db.Integer, default=0)  # Añadida columna orden para dispositivos

class UserRoomPermission(db.Model):
    __tablename__ = 'user_room_permissions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('habitaciones.id'), nullable=False)

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
            session.modified = True  # Asegurar que la sesión se guarde

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



# API: Obtener permisos de un rol
@app.route('/api/roles/<role>/permissions', methods=['GET'])
@require_jwt
def get_role_permissions(role):
    permissions = roles_permissions.get(role, [])
    return jsonify({"permissions": permissions})

# API: Obtener dispositivos
@app.route('/api/dispositivos', methods=['GET'])
@require_jwt
def get_dispositivos():
    dispositivos = Dispositivos.query.all()
    return jsonify([{ "id": d.id, "nombre": d.nombre, "ip": d.ip, "tipo": d.tipo, "habitacion_id": d.habitacion_id, "ultimo_consumo": d.ultimo_consumo, "estado": d.estado, "orden": d.orden } for d in dispositivos])

# API: Cambiar estado de un dispositivo
@app.route('/api/toggle_device/<int:device_id>', methods=['POST'])
@require_jwt
def toggle_device(device_id):
    device = Dispositivos.query.get(device_id)
    if device:
        device.estado = not device.estado
        db.session.commit()
        socketio.emit('update_device', {"id": device.id, "estado": device.estado})
        return jsonify({"message": "Estado cambiado"}), 200
    return jsonify({"error": "Dispositivo no encontrado"}), 404

# API: Obtener habitaciones con permisos del usuario
@app.route('/api/habitaciones', methods=['GET'])
@require_jwt
def get_habitaciones():
    user_id = request.user_id
    user = User.query.get(user_id)

    if user.role == 'admin':
        habitaciones = Habitaciones.query.all()
    else:
        permisos = UserRoomPermission.query.filter_by(user_id=user_id).all()
        room_ids = [permiso.room_id for permiso in permisos]
        habitaciones = Habitaciones.query.filter(Habitaciones.id.in_(room_ids)).all()

    return jsonify([{ "id": h.id, "nombre": h.nombre, "tablero_id": h.tablero_id } for h in habitaciones])

# API: Obtener habitaciones por tablero
@app.route('/api/tableros/<int:tablero_id>/habitaciones', methods=['GET'])
@require_jwt
def get_habitaciones_by_tablero(tablero_id):
    habitaciones = Habitaciones.query.filter_by(tablero_id=tablero_id).all()
    return jsonify([{ "id": h.id, "nombre": h.nombre, "tablero_id": h.tablero_id } for h in habitaciones])

# API: Eliminar una habitación
@app.route('/api/habitaciones/<int:habitacion_id>', methods=['DELETE'])
@require_jwt
def eliminar_habitacion(habitacion_id):
    habitacion = Habitaciones.query.get(habitacion_id)
    if habitacion:
        db.session.delete(habitacion)
        db.session.commit()
        return jsonify({"message": "Habitación eliminada correctamente"}), 200
    return jsonify({"error": "Habitación no encontrada"}), 404

# API: Crear una nueva habitación dentro de un tablero
@app.route('/api/habitaciones', methods=['POST'])
@require_jwt
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
@require_jwt
def get_tableros():
    tableros = Tableros.query.all()
    return jsonify([{ "id": t.id, "nombre": t.nombre } for t in tableros])

# API: Crear un nuevo tablero
@app.route('/api/tableros', methods=['POST'])
@require_jwt
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
@require_jwt
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
@require_jwt
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
@require_jwt
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

# API: Actualizar orden de dispositivos dentro de una habitación
@app.route('/api/dispositivos/orden', methods=['PUT'])
@require_jwt
@require_permission('update_device_order')
def actualizar_orden_dispositivos():
    try:
        data = request.get_json()
        for item in data:
            dispositivo = Dispositivos.query.get(item['id'])
            if dispositivo:
                dispositivo.orden = item['orden']
        db.session.commit()
        return jsonify({"message": "Orden de dispositivos actualizado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API: Renombrar un tablero
@app.route('/api/tableros/<int:tablero_id>/renombrar', methods=['PUT'])
@require_jwt
@require_permission('edit_dashboard')
def renombrar_tablero(tablero_id):
    data = request.get_json()
    nuevo_nombre = data.get('nombre', '').strip()

    if not nuevo_nombre:
        return jsonify({"error": "El nombre no puede estar vacío"}), 400
        
    # Verificar si ya existe otro tablero con ese nombre
    tablero_existente = Tableros.query.filter(Tableros.nombre == nuevo_nombre, Tableros.id != tablero_id).first()
    if tablero_existente:
        return jsonify({"error": "Ya existe un tablero con ese nombre"}), 409
    
    tablero = Tableros.query.get(tablero_id)
    if not tablero:
        return jsonify({"error": "Tablero no encontrado"}), 404
        
    tablero.nombre = nuevo_nombre
    db.session.commit()
    
    return jsonify({"message": "Tablero renombrado correctamente", "id": tablero.id, "nombre": tablero.nombre}), 200

# API: Renombrar una habitación
@app.route('/api/habitaciones/<int:habitacion_id>/renombrar', methods=['PUT'])
@require_jwt
@require_permission('edit_dashboard')
def renombrar_habitacion(habitacion_id):
    data = request.get_json()
    nuevo_nombre = data.get('nombre', '').strip()

    if not nuevo_nombre:
        return jsonify({"error": "El nombre no puede estar vacío"}), 400
        
    # Verificar si ya existe otra habitación con ese nombre
    habitacion_existente = Habitaciones.query.filter(Habitaciones.nombre == nuevo_nombre, Habitaciones.id != habitacion_id).first()
    if habitacion_existente:
        return jsonify({"error": "Ya existe una habitación con ese nombre"}), 409
    
    habitacion = Habitaciones.query.get(habitacion_id)
    if not habitacion:
        return jsonify({"error": "Habitación no encontrada"}), 404
        
    habitacion.nombre = nuevo_nombre
    db.session.commit()
    
    return jsonify({"message": "Habitación renombrada correctamente", "id": habitacion.id, "nombre": habitacion.nombre}), 200

# API: Cambiar una habitación de tablero
@app.route('/api/habitaciones/<int:habitacion_id>/cambiar-tablero', methods=['PUT'])
@require_jwt
@require_permission('edit_dashboard')
def cambiar_tablero_habitacion(habitacion_id):
    data = request.get_json()
    nuevo_tablero_id = data.get('tablero_id')
    
    if not nuevo_tablero_id:
        return jsonify({"error": "El ID del tablero destino es requerido"}), 400
    
    habitacion = Habitaciones.query.get(habitacion_id)
    if not habitacion:
        return jsonify({"error": "Habitación no encontrada"}), 404
        
    # Verificar que el tablero destino exista
    tablero_destino = Tableros.query.get(nuevo_tablero_id)
    if not tablero_destino:
        return jsonify({"error": "Tablero destino no encontrado"}), 404
    
    # Obtener el mayor orden en el tablero destino para colocar la habitación al final
    max_orden = db.session.query(db.func.coalesce(db.func.max(Habitaciones.orden), -1)).filter(
        Habitaciones.tablero_id == nuevo_tablero_id
    ).scalar()
    
    # Cambiar la habitación al nuevo tablero
    habitacion.tablero_id = nuevo_tablero_id
    habitacion.orden = max_orden + 1
    
    db.session.commit()
    
    return jsonify({
        "message": "Habitación movida correctamente", 
        "id": habitacion.id, 
        "nombre": habitacion.nombre,
        "tablero_id": habitacion.tablero_id,
        "orden": habitacion.orden
    }), 200

# ===========================
# API: Iniciar descubrimiento
# ===========================
@app.route('/api/start_discovery', methods=['GET', 'POST'])
@require_jwt
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
@require_jwt
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
@require_jwt
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

        # Si el usuario es admin, establecer todas las habitaciones permitidas por defecto
        if role == 'admin':
            habitaciones = Habitaciones.query.all()
            for habitacion in habitaciones:
                permission = UserRoomPermission(user_id=new_user.id, room_id=habitacion.id)
                db.session.add(permission)
            db.session.commit()

        return jsonify({"message": "Usuario creado correctamente", "user": {"id": new_user.id, "username": new_user.username, "email": new_user.email, "role": new_user.role}}), 201
    except Exception as e:
        logging.error(f"Error al crear el usuario: {str(e)}")
        return jsonify({"error": f"Error al crear el usuario: {str(e)}"}), 500

# API: Obtener todos los usuarios
@app.route('/api/usuarios', methods=['GET'])
@require_jwt
def get_users():
    users = User.query.all()
    return jsonify([{
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "nombre": user.nombre
    } for user in users])

# API: Eliminar un usuario
@app.route('/api/usuarios/<int:user_id>', methods=['DELETE'])
@require_jwt
def delete_user(user_id):
    user = User.query.get(user_id)
    if user:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "Usuario eliminado correctamente"}), 200
    return jsonify({"error": "Usuario no encontrado"}), 404

# API: Actualizar rol de un usuario
@app.route('/api/usuarios/<int:user_id>/rol', methods=['PUT'])
@require_jwt
def actualizar_rol_usuario(user_id):
    try:
        data = request.get_json()
        nuevo_rol = data.get('rol')

        logging.debug(f"Datos recibidos para actualizar rol: {data}")

        if not nuevo_rol:
            logging.error("Error: El rol es obligatorio")
            return jsonify({"error": "El rol es obligatorio"}), 400

        usuario = User.query.get(user_id)
        if not usuario:
            logging.error(f"Error: Usuario con ID {user_id} no encontrado")
            return jsonify({"error": "Usuario no encontrado"}), 404

        if nuevo_rol not in roles_permissions:
            logging.error(f"Error: Rol no válido - {nuevo_rol}")
            return jsonify({"error": "Rol no válido"}), 400

        logging.debug(f"Actualizando rol del usuario {user_id} a {nuevo_rol}")
        usuario.role = nuevo_rol
        db.session.commit()

        logging.info(f"Rol del usuario {user_id} actualizado a {nuevo_rol}")
        return jsonify({"message": "Rol actualizado correctamente"}), 200
    except Exception as e:
        logging.error(f"Error al actualizar el rol del usuario: {str(e)}")
        return jsonify({"error": f"Error al actualizar el rol del usuario: {str(e)}"}), 500


# API: Guardar permisos de habitaciones
@app.route('/api/save_user_permissions', methods=['POST'])
@require_jwt
def save_user_permissions():
    data = request.json
    user_id = data.get('user_id')
    room_ids = data.get('room_ids')

    if not user_id or room_ids is None:
        return jsonify({'success': False, 'message': 'Missing fields'}), 400

    user = User.query.get(user_id)
    
    if user:
        # Eliminar todos los permisos existentes para el usuario
        UserRoomPermission.query.filter_by(user_id=user_id).delete()

        if room_ids:
            # Agregar los permisos específicos para las habitaciones proporcionadas
            for room_id in room_ids:
                permission = UserRoomPermission(user_id=user_id, room_id=room_id)
                db.session.add(permission)
                
        db.session.commit()
        return jsonify({'success': True, 'message': 'Permissions saved successfully'}), 200

    return jsonify({'success': False, 'message': 'User not found'}), 404


# API: Obtener los permisos de habitaciones
@app.route('/api/get_user_permissions/<int:user_id>', methods=['GET'])
@require_jwt
def get_user_permissions(user_id):
    permissions = UserRoomPermission.query.filter_by(user_id=user_id).all()
    room_ids = [permission.room_id for permission in permissions]
    return jsonify({'room_ids': room_ids})


# API: Asignar dispositivos a una habitación
@app.route('/api/asignar_habitacion', methods=['POST'])
@require_jwt
def asignar_habitacion():
    data = request.get_json()
    device_ids = data.get('device_ids')
    habitacion_id = data.get('habitacion_id')  # Puede ser null

    if not device_ids:
        return jsonify({'success': False, 'message': 'Missing fields'}), 400

    try:
        dispositivos = Dispositivos.query.filter(Dispositivos.id.in_(device_ids)).all()
        for dispositivo in dispositivos:
            dispositivo.habitacion_id = habitacion_id
        db.session.commit()
        return jsonify({'success': True, 'message': 'Devices assigned successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


# API: Obtener dispositivos por habitación
@app.route('/api/habitaciones/<int:habitacion_id>/dispositivos', methods=['GET'])
@require_jwt
def get_dispositivos_by_habitacion(habitacion_id):
    dispositivos = Dispositivos.query.filter_by(habitacion_id=habitacion_id).order_by(Dispositivos.orden).all()
    return jsonify([{ 
        "id": d.id, 
        "nombre": d.nombre, 
        "ip": d.ip, 
        "tipo": d.tipo, 
        "habitacion_id": d.habitacion_id, 
        "ultimo_consumo": d.ultimo_consumo, 
        "estado": d.estado,
        "orden": d.orden
    } for d in dispositivos])


# API: Endpoint de prueba de conexión
@app.route('/api/test', methods=['GET'])
def test_connection():
    return jsonify({"message": "Connection successful"}), 200



# === Endpoints para la integración con Shelly.ioAdapter ===

@app.route('/api/shelly/devices', methods=['GET'])
@require_jwt
def get_shelly_devices():
    """Obtiene todos los dispositivos Shelly descubiertos por el adaptador"""
    devices = shelly_interface.get_devices()
    return jsonify(devices)

@app.route('/api/shelly/discover', methods=['POST'])
@require_jwt
@require_permission('discover_devices')
def discover_shelly_devices():
    """Inicia el descubrimiento de dispositivos Shelly en la red"""
    success = shelly_interface.discover_devices()
    if success:
        return jsonify({"status": "ok", "message": "Descubrimiento iniciado"}), 200
    else:
        return jsonify({"status": "error", "message": "Error al iniciar el descubrimiento"}), 500

@app.route('/api/shelly/devices/<device_id>', methods=['GET'])
@require_jwt
def get_shelly_device_info(device_id):
    """Obtiene información detallada de un dispositivo Shelly"""
    device_info = shelly_interface.get_device_info(device_id)
    if device_info:
        return jsonify(device_info)
    else:
        return jsonify({"status": "error", "message": "Dispositivo no encontrado"}), 404

@app.route('/api/shelly/devices/<device_id>/status', methods=['GET'])
@require_jwt
def get_shelly_device_status(device_id):
    """Obtiene el estado actual de un dispositivo Shelly"""
    device_status = shelly_interface.get_device_status(device_id)
    if device_status:
        return jsonify(device_status)
    else:
        return jsonify({"status": "error", "message": "Error al obtener estado del dispositivo"}), 500

@app.route('/api/shelly/devices/<device_id>/control', methods=['POST'])
@require_jwt
@require_permission('control_devices')
def control_shelly_device(device_id):
    """Controla un dispositivo Shelly (encender/apagar)"""
    data = request.json
    if not data or 'channel' not in data or 'state' not in data:
        return jsonify({"status": "error", "message": "Datos incompletos"}), 400
    
    channel = int(data['channel'])
    state = bool(data['state'])
    
    success = shelly_interface.control_device(device_id, channel, state)
    if success:
        return jsonify({"status": "ok", "message": "Dispositivo controlado correctamente"})
    else:
        return jsonify({"status": "error", "message": "Error al controlar el dispositivo"}), 500

@app.route('/api/shelly/devices/<device_id>/firmware', methods=['GET'])
@require_jwt
@require_permission('manage_devices')
def check_shelly_firmware(device_id):
    """Verifica si hay actualizaciones de firmware disponibles para un dispositivo Shelly"""
    firmware_info = shelly_interface.check_firmware_updates(device_id)
    if firmware_info:
        return jsonify(firmware_info)
    else:
        return jsonify({"status": "error", "message": "Error al verificar actualizaciones"}), 500

@app.route('/api/shelly/devices/<device_id>/firmware/update', methods=['POST'])
@require_jwt
@require_permission('manage_devices')
def update_shelly_firmware(device_id):
    """Inicia la actualización de firmware para un dispositivo Shelly"""
    success = shelly_interface.update_firmware(device_id)
    if success:
        return jsonify({"status": "ok", "message": "Actualización iniciada"})
    else:
        return jsonify({"status": "error", "message": "Error al iniciar la actualización"}), 500

@app.route('/api/shelly/devices/<device_id>/energy', methods=['GET'])
@require_jwt
def get_shelly_energy_data(device_id):
    """Obtiene datos de consumo energético para dispositivos Shelly compatibles"""
    energy_data = shelly_interface.get_device_energy_data(device_id)
    if energy_data:
        return jsonify(energy_data)
    else:
        return jsonify({"status": "error", "message": "Datos de energía no disponibles"}), 404

@app.route('/api/shelly/sync_database', methods=['POST'])
@require_jwt
@require_permission('manage_devices')
def sync_shelly_devices():
    """
    Sincroniza los dispositivos Shelly descubiertos con la base de datos
    Actualiza los dispositivos existentes y añade los nuevos
    """
    try:
        # Obtener todos los dispositivos desde el adaptador
        shelly_devices = shelly_interface.get_devices()
        
        # Obtener todos los dispositivos de la base de datos
        db_devices = Dispositivos.query.all()
        db_devices_by_ip = {d.ip: d for d in db_devices}
        
        # Contador de dispositivos actualizados y añadidos
        updated_count = 0
        added_count = 0
        
        # Iterar por todos los dispositivos Shelly
        for device in shelly_devices:
            ip = device.get('ip', '')
            if not ip:
                continue
                
            # Crear un nombre amigable para el dispositivo
            friendly_name = device.get('name', '') or f"Shelly {device.get('type', '')} {device.get('id', '')}"
            
            # Verificar si el dispositivo ya existe en la base de datos
            if ip in db_devices_by_ip:
                # Actualizar dispositivo existente
                db_device = db_devices_by_ip[ip]
                db_device.nombre = friendly_name
                db_device.tipo = device.get('type', '')
                db_device.estado = device.get('online', False)
                
                # Actualizar último consumo si está disponible
                if 'meters' in device and len(device['meters']) > 0:
                    db_device.ultimo_consumo = device['meters'][0].get('power', 0)
                
                updated_count += 1
            else:
                # Crear nuevo dispositivo
                new_device = Dispositivos(
                    nombre=friendly_name,
                    ip=ip,
                    tipo=device.get('type', ''),
                    estado=device.get('online', False),
                    ultimo_consumo=device.get('meters', [{}])[0].get('power', 0) if 'meters' in device and len(device['meters']) > 0 else 0
                )
                db.session.add(new_device)
                added_count += 1
        
        # Guardar cambios en la base de datos
        db.session.commit()
        
        return jsonify({
            "status": "ok",
            "message": f"Sincronización completada: {updated_count} dispositivos actualizados, {added_count} dispositivos añadidos"
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": f"Error durante la sincronización: {str(e)}"
        }), 500






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
