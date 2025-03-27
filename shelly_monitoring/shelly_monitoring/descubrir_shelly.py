#!/usr/bin/env python3

import os
import sys
import subprocess
import ipaddress
import requests
import json
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor


# 📌 Definir ruta del entorno virtual
VENV_DIR = "/opt/shelly_monitoring/venv"
VENV_PYTHON = os.path.join(VENV_DIR, "bin", "python3")
VENV_PIP = os.path.join(VENV_DIR, "bin", "pip")

# 📌 Verificar si estamos dentro del entorno virtual
if sys.prefix != VENV_DIR:
    print("🔄 Reiniciando el script dentro del entorno virtual...")
    os.execv(VENV_PYTHON, [VENV_PYTHON] + sys.argv)

# 📌 Instalar dependencias si no existen
try:
    import psycopg2
except ImportError:
    print("📦 psycopg2 no encontrado. Instalando en el entorno virtual...")
    subprocess.run([VENV_PIP, "install", "psycopg2-binary"], check=True)
    import psycopg2  # Volver a importar después de la instalación

# 📌 Configuración de la base de datos
DB_NAME = "shelly_db"
DB_USER = "shelly_user"
DB_PASSWORD = "shelly_pass"
DB_HOST = "localhost"

# 🚀 Configuración de escaneo
ENDPOINTS = ["/rpc/Shelly.GetDeviceInfo", "/settings"]
TIMEOUT = 4
TIMEOUT_EXTRA = 6
REINTENTOS = 2
MAX_WORKERS = 75
MAX_WORKERS_REINTENTO = 50

# 📌 Datos de reintentos
ips_para_reintento = []
ips_exitosas_en_reintento = []

# ✅ 1️⃣ Conectar a la base de datos
def conectar_db():
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST
        )
        return conn
    except Exception as e:
        print(f"❌ Error al conectar con la base de datos: {e}")
        sys.exit(1)

# ✅ 2️⃣ Funciones de detección de dispositivos Shelly
def extraer_modelo(texto):
    """Extrae el nombre del modelo del ID o hostname con formato 'shelly<modelo>-<mac>'"""
    if texto and "-" in texto:
        return texto.split("-")[0].replace("shelly", "").upper()
    return None

def hacer_peticion(url, timeout=TIMEOUT, reintentos=REINTENTOS):
    """Realiza una petición GET con reintentos"""
    for intento in range(reintentos):
        try:
            respuesta = requests.get(url, timeout=timeout)
            if respuesta.status_code == 200:
                return respuesta.json()
        except requests.RequestException:
            pass
    return None

def obtener_info_desde_rpc(ip, timeout=TIMEOUT):
    """Intenta obtener el modelo y nombre desde /rpc/Shelly.GetDeviceInfo"""
    url = f"http://{ip}/rpc/Shelly.GetDeviceInfo"
    datos = hacer_peticion(url, timeout=timeout)
    if datos:
        modelo = extraer_modelo(datos.get("id"))
        nombre = datos.get("name") or "SIN_NOMBRE"
        return modelo, nombre
    return None, "SIN_NOMBRE"

def obtener_info_desde_settings(ip, timeout=TIMEOUT):
    """Intenta obtener el modelo y nombre desde /settings"""
    url = f"http://{ip}/settings"
    datos = hacer_peticion(url, timeout=timeout)
    if datos and "device" in datos:
        modelo = extraer_modelo(datos["device"].get("hostname"))
        nombre = datos.get("login", {}).get("name") or "SIN_NOMBRE"
        return modelo, nombre
    return None, "SIN_NOMBRE"

def hacer_ping(ip):
    """Hace ping a la IP y devuelve True si responde"""
    print(f"📡 Haciendo ping a {ip}...")
    try:
        resultado = subprocess.run(["ping", "-c", "1", "-W", "1", ip], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return resultado.returncode == 0
    except Exception:
        return False

def identificar_shelly(ip, timeout=TIMEOUT):
    """Intenta identificar un dispositivo Shelly en la IP dada"""
    modelo, nombre = obtener_info_desde_rpc(ip, timeout)
    if not modelo:
        modelo, nombre = obtener_info_desde_settings(ip, timeout)

    if modelo:
        print(f"✅ Shelly detectado en {ip:<15} ({modelo:<8}) - Nombre: {nombre}")
    return ip, modelo, nombre

# ✅ 3️⃣ Escanear la red
def escanear_red(subred):
    """Escanea una subred para identificar dispositivos Shelly"""
    print(f"🔍 Escaneando la red: {subred}")
    dispositivos_shelly = {}
    ip_sin_respuesta = []
    ips_analizadas_con_ping = []  # Nueva lista para contar todas las IPs a las que se les hizo ping

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        subred = subred.strip()  # 🔥 Asegura que no haya espacios en blanco
        resultados = list(executor.map(identificar_shelly, [str(ip) for ip in ipaddress.IPv4Network(subred, strict=False)]))

    for ip, modelo, nombre in resultados:
        if modelo:
            dispositivos_shelly[ip] = (modelo, nombre)
        else:
            ip_sin_respuesta.append(ip)

    # 🔥 Intentar con IPs que no respondieron pero sí al ping
    with ThreadPoolExecutor(max_workers=MAX_WORKERS_REINTENTO) as executor:
        resultados_ping = list(executor.map(hacer_ping, ip_sin_respuesta))

    for i, ip in enumerate(ip_sin_respuesta):
        ips_analizadas_con_ping.append(ip)  # Guardar todas las IPs a las que se les hizo ping
        if resultados_ping[i]:  # Si responde al ping
            print(f"🔄 IP {ip} responde al ping, reintentando confirmar si es un Shelly con timeout extendido...")
            ips_para_reintento.append(ip)

    if ips_para_reintento:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS_REINTENTO) as executor:
            resultados_extra = list(executor.map(lambda ip: identificar_shelly(ip, TIMEOUT_EXTRA), ips_para_reintento))

        for ip, modelo, nombre in resultados_extra:
            if modelo:
                dispositivos_shelly[ip] = (modelo, nombre)
                ips_exitosas_en_reintento.append(ip)
                print(f"✅ (Reintento) Shelly detectado en {ip:<15} ({modelo:<8}) - Nombre: {nombre}")

    return dispositivos_shelly, ips_analizadas_con_ping  # Retornar también la lista de IPs analizadas con ping

# ✅ 4️⃣ Guardar en la base de datos y generar resumen
def guardar_en_db(dispositivos):
    conn = conectar_db()
    cur = conn.cursor()

    existentes = 0
    agregados = 0
    actualizados = 0

    for ip, (modelo, nombre) in dispositivos.items():
        cur.execute("SELECT id, nombre, tipo FROM dispositivos WHERE ip = %s", (ip,))
        resultado = cur.fetchone()

        if resultado:
            # La IP ya existe en la DB
            id_dispositivo, nombre_actual, tipo_actual = resultado
            existentes += 1  # 📌 Contar correctamente los dispositivos ya existentes

            if nombre_actual != nombre or tipo_actual != modelo:
                cur.execute("UPDATE dispositivos SET nombre = %s, tipo = %s WHERE id = %s", (nombre, modelo, id_dispositivo))
                actualizados += 1  # 📌 Contar el dispositivo como actualizado
        else:
            # La IP no existe en la DB, insertar nuevo dispositivo
            cur.execute("INSERT INTO dispositivos (nombre, ip, tipo) VALUES (%s, %s, %s)", (nombre, ip, modelo))
            agregados += 1  # 📌 Contar el dispositivo como agregado

    conn.commit()
    cur.close()
    conn.close()

    return existentes, agregados, actualizados

# ✅ 5️⃣ Resumen Final COMPLETO
def generar_resumen(dispositivos_totales, ips_analizadas_total):
    existentes, agregados, actualizados = guardar_en_db(dispositivos_totales)
    conteo_modelos = Counter([modelo for modelo, _ in dispositivos_totales.values()])

    print("\n🔎 **Resumen del Escaneo:**")
    print(f"📌 **Total de dispositivos Shelly detectados:** {len(dispositivos_totales)}")
    for modelo, cantidad in conteo_modelos.most_common():
        print(f"   - {modelo}: {cantidad}")

    print(f"\n📡 **IPs que fueron analizadas con ping:** {len(ips_analizadas_total)}")  # ✅ Corrección
    print(f"🔄 **IPs que se reintentaron tras responder al ping:** {len(ips_para_reintento)}")
    print(f"✅ **Dispositivos detectados en reintento:** {len(ips_exitosas_en_reintento)}")

    print(f"\n✅ **Dispositivos ya existentes en la DB:** {existentes}")
    print(f"🆕 **Dispositivos nuevos agregados a la DB:** {agregados}")
    print(f"🔄 **Dispositivos actualizados:** {actualizados}")

    print("\n✅ **Escaneo finalizado y datos guardados en la base de datos.**")



# ✅ 6️⃣ Ejecutar todo
def main():
    if len(sys.argv) > 1:
        # Si se ejecuta con argumentos, usarlos como las subredes a escanear
        subredes = [subred.strip() for subred in sys.argv[1:] if subred.strip()]
    else:
        # Si no se pasa argumento, pedir al usuario
        subredes = [subred.strip() for subred in input("Ingrese las subredes a escanear (ejemplo: 192.168.1.0/24, 10.1.100.0/24): ").split(",") if subred.strip()]

    subredes = [subred.strip() for subred in subredes]

    dispositivos_totales = {}
    ips_analizadas_total = []  # Nueva lista para almacenar las IPs analizadas con ping en todas las subredes

    for subred in subredes:
        dispositivos, ips_analizadas = escanear_red(subred)  # Capturar ambos valores
        dispositivos_totales.update(dispositivos)
        ips_analizadas_total.extend(ips_analizadas)  # Agregar todas las IPs analizadas con ping

    generar_resumen(dispositivos_totales, ips_analizadas_total)  # Pasar las IPs analizadas a generar_resumen()

class DualLogger:
    """Clase que permite escribir simultáneamente en la terminal y en el log con timestamp."""
    def __init__(self, log_file_path):
        self.log_file = open(log_file_path, "a")
    
    def write(self, message):
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S')  # Formato de fecha y hora
        if message.strip():  # Evita escribir líneas vacías con timestamp
            log_message = f"[{timestamp}] {message}"  # Guarda con timestamp en el log
            clean_message = message  # Sin timestamp para la página web
        else:
            log_message = message  # Para que los saltos de línea no tengan timestamp
            clean_message = message
        
        sys.__stdout__.write(clean_message)  # En la terminal y web, sin timestamp
        self.log_file.write(log_message)  # En el log con timestamp

    def flush(self):
        sys.__stdout__.flush()
        self.log_file.flush()

if __name__ == "__main__":
    # 📌 Pedimos la entrada del usuario ANTES de redirigir stdout y stderr
    if len(sys.argv) > 1:
        subredes = sys.argv[1:]
    else:
        subredes = input("Ingrese las subredes a escanear (ejemplo: 192.168.1.0/24, 10.1.100.0/24): ").split(",")

    # 📌 Ahora redirigimos stdout y stderr
    log_file_path = "/var/log/shelly_discovery.log"
    dual_logger = DualLogger(log_file_path)
    sys.stdout = dual_logger  # Redirige stdout a la terminal y al log
    sys.stderr = dual_logger  # Redirige stderr a la terminal y al log

    print("\n=== Inicio del descubrimiento ===\n")

    dispositivos_totales = {}
    ips_analizadas_total = []

    for subred in subredes:
        dispositivos, ips_analizadas = escanear_red(subred)
        dispositivos_totales.update(dispositivos)
        ips_analizadas_total.extend(ips_analizadas)

    generar_resumen(dispositivos_totales, ips_analizadas_total)

    print("\n=== Fin del descubrimiento ===\n")
