-- Agregar la columna 'orden' a la tabla 'tableros' si no existe
ALTER TABLE tableros ADD COLUMN IF NOT EXISTS orden INT DEFAULT 0;
