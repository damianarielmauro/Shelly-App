#!/bin/bash
set -e

echo "*****************************************"
echo "*       02_instalacion_postgresql       *"
echo "*****************************************"

echo "🐘 Iniciando la instalación y configuración de PostgreSQL..."

# ===========================
# 📦 Instalación de PostgreSQL
# ===========================

echo "📦 Instalando PostgreSQL y herramientas adicionales..."
sudo apt install -y postgresql postgresql-contrib

# Habilitar y iniciar el servicio de PostgreSQL
echo "🔧 Habilitando y arrancando PostgreSQL..."
sudo systemctl enable postgresql
sudo systemctl start postgresql

# ===========================
# 🛠️ Configuración de la base de datos y usuario
# ===========================

DB_NAME="shelly_db"
DB_USER="shelly_user"
DB_PASSWORD="shelly_pass"

echo "🔧 Configurando la base de datos y el usuario en PostgreSQL..."

# Crear la base de datos si no existe
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE $DB_NAME"

# Crear el usuario si no existe
sudo -u postgres psql <<EOF
DO
\$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
      CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
      ALTER ROLE $DB_USER CREATEDB;
   END IF;
END;
\$\$;

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

echo "✅ Base de datos y usuario creados correctamente."

# ===========================
# 📂 Creación de tablas necesarias
# ===========================

echo "📂 Creando estructura de la base de datos..."
sudo -u postgres psql -d $DB_NAME <<EOF
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crear tablas y asignar permisos
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'usuario')) NOT NULL,
    username VARCHAR(80) UNIQUE NOT NULL  -- Añadida la columna username
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (nombre) VALUES ('admin') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO roles (nombre) VALUES ('usuario') ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS permisos (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    tablero_id INT REFERENCES tableros(id) ON DELETE CASCADE,
    dispositivo_id INT REFERENCES dispositivos(id) ON DELETE CASCADE,
    permiso_tipo VARCHAR(50) CHECK (permiso_tipo IN ('ver', 'controlar'))
);

CREATE TABLE IF NOT EXISTS tableros (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS habitaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    tablero_id INT REFERENCES tableros(id) ON DELETE CASCADE
);
-- 🔹 Agregar columna orden en habitaciones si no existe
ALTER TABLE habitaciones ADD COLUMN IF NOT EXISTS orden INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS dispositivos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ip VARCHAR(15) UNIQUE NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    habitacion_id INT REFERENCES habitaciones(id) ON DELETE SET NULL,
    ultimo_consumo FLOAT DEFAULT 0,
    tipo_artefacto_id INT REFERENCES tipos_artefacto(id) ON DELETE SET NULL,
    estado BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS historico_consumo (
    id SERIAL PRIMARY KEY,
    dispositivo_id INT REFERENCES dispositivos(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consumo FLOAT NOT NULL
);

CREATE TABLE IF NOT EXISTS tipos_artefacto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dispositivos_ip ON dispositivos(ip);

-- 🔹 AGREGAR TABLA DEVICE PARA COMPATIBILIDAD CON EL BACKEND

CREATE TABLE IF NOT EXISTS device (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    power FLOAT DEFAULT 0.0,
    state BOOLEAN DEFAULT FALSE,
    room VARCHAR(50)
);
EOF

# ===========================
# 🔧 Generar hash bcrypt para la contraseña de admin
# ===========================

echo "🔧 Generando hash bcrypt para la contraseña de admin..."
PASSWORD="admin123"
HASHED_PASSWORD=$(python3 -c "import bcrypt; print(bcrypt.hashpw('$PASSWORD'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'))")

echo "🔧 Insertando usuario administrador por defecto en la base de datos..."
sudo -u postgres psql -d $DB_NAME <<EOF
DO
\$\$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@shelly.local') THEN
       INSERT INTO usuarios (nombre, email, password_hash, role, username)
       VALUES ('Administrador', 'admin@shelly.local',
               '$HASHED_PASSWORD',
               'admin', 'admin')
       ON CONFLICT (email) DO NOTHING;
   END IF;
END;
\$\$;
EOF

echo "✅ Estructura de la base de datos creada correctamente."

# ===========================
# 🔧 Ajuste de permisos en la base de datos
# ===========================

echo "🔧 Ajustando permisos y propietarios..."
sudo -u postgres psql -d $DB_NAME <<EOF
ALTER SCHEMA public OWNER TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;

DO
\$\$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' OWNER TO $DB_USER';
        EXECUTE 'GRANT ALL PRIVILEGES ON TABLE ' || quote_ident(r.tablename) || ' TO $DB_USER';
    END LOOP;
    
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequencename) || ' OWNER TO $DB_USER';
        EXECUTE 'GRANT ALL PRIVILEGES ON SEQUENCE ' || quote_ident(r.sequencename) || ' TO $DB_USER';
    END LOOP;
    
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE specific_schema = 'public' AND routine_name = 'digest') LOOP
        IF (SELECT count(*) FROM pg_proc WHERE proname = 'digest') = 1 THEN
            EXECUTE 'ALTER FUNCTION ' || quote_ident(r.routine_name) || ' OWNER TO $DB_USER';
        ELSE
            RAISE NOTICE 'Multiple functions named "digest" found, not changing owner.';
        END IF;
    END LOOP;
END;
\$\$;
EOF

echo "✅ Permisos configurados correctamente."

echo "🐘 PostgreSQL instalado y configurado exitosamente."
