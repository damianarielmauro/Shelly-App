#!/bin/bash

if [ $# -ne 3 ]; then
    echo "Uso: $0 <directorio> <texto_a_buscar> <texto_reemplazo>"
    echo "Ejemplo: $0 /home/usuario/proyecto 'texto viejo' 'texto nuevo'"
    exit 1
fi

directorio="$1"
texto_buscar="$2"
texto_reemplazo="$3"

# Crear archivo temporal para almacenar resultados
temp_file=$(mktemp)

# Buscar y reemplazar
find "$directorio" -type f -exec grep -l "$texto_buscar" {} \; > "$temp_file"

total_archivos=0
total_reemplazos=0

# Leer del archivo temporal en lugar de usar pipe
while read archivo; do
    # Contar ocurrencias antes de reemplazar
    ocurrencias=$(grep -o "$texto_buscar" "$archivo" | wc -l)
    
    if [ $ocurrencias -gt 0 ]; then
        echo "Modificando: $archivo ($ocurrencias ocurrencias)"
        sed -i "s/$texto_buscar/$texto_reemplazo/g" "$archivo"
        
        total_archivos=$((total_archivos+1))
        total_reemplazos=$((total_reemplazos+ocurrencias))
    fi
done < "$temp_file"

# Eliminar archivo temporal
rm "$temp_file"

echo "===================="
echo "Resumen de cambios:"
echo "Total de archivos modificados: $total_archivos"
echo "Total de reemplazos realizados: $total_reemplazos"
