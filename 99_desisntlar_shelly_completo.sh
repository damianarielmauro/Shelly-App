#!/bin/bash

echo "Desinstalar Shelly Monitoring"
echo "Eliminando /opt/shelly_monitoring..."
sudo rm -rf /opt/shelly_monitoring

echo "Buscando procesos de PostgreSQL en ejecución..."
PG_PROCESSES=$(pgrep -u postgres)

if [ -n "$PG_PROCESSES" ]; then
    echo "Matando procesos de PostgreSQL..."
    sudo kill -9 $PG_PROCESSES
else
    echo "No se encontraron procesos de PostgreSQL en ejecución."
fi

echo "Deteniendo servicio PostgreSQL..."
sudo systemctl stop postgresql
sudo systemctl disable postgresql

echo "Eliminando paquetes de PostgreSQL..."
sudo apt remove --purge -y postgresql postgresql-* postgresql-client-* postgresql-contrib postgresql-common

echo "Eliminando paquetes huérfanos..."
sudo apt autoremove --purge -y
sudo apt clean

echo "Eliminando archivos de configuración y datos..."
sudo rm -rf /var/lib/postgresql/
sudo rm -rf /var/log/postgresql/
sudo rm -rf /etc/postgresql/
sudo rm -rf /usr/include/postgresql
sudo rm -rf /sys/fs/cgroup/system.slice/system-postgresql.slice

echo "Eliminando usuario y grupo 'postgres'..."
sudo deluser --remove-home postgres
sudo delgroup postgres

echo "Eliminando restos de configuración en dpkg..."
sudo rm -rf /var/lib/dpkg/info/postgresql*


echo "PostgreSQL ha sido completamente eliminado."
