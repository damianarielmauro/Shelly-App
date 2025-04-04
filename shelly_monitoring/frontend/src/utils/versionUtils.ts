/**
 * Utilidad para manejar formatos de versión de Shelly
 */

/**
 * Extrae la versión semántica de un string de versión completo de Shelly
 * Formato de entrada: AAAAMMDD-HHMMSS/vX.Y.Z@commit
 * @param versionString String completo de versión
 * @returns Versión semántica (X.Y.Z)
 */
export const extractSemVer = (versionString: string): string => {
  if (!versionString) return '0.0.0';
  
  // Intentar encontrar el patrón vX.Y.Z
  const match = versionString.match(/v(\d+\.\d+\.\d+)/);
  if (match && match[1]) {
    return match[1];
  }
  
  // Si no encuentra el patrón, devolver la cadena original o 0.0.0
  return versionString || '0.0.0';
};

/**
 * Compara dos versiones semánticas y devuelve:
 * -1 si version1 < version2
 *  0 si version1 = version2
 *  1 si version1 > version2
 */
export const compareVersions = (version1: string, version2: string): number => {
  // Extraer las versiones semánticas si son strings de formato largo
  const semVer1 = extractSemVer(version1).split('.').map(Number);
  const semVer2 = extractSemVer(version2).split('.').map(Number);
  
  // Comparar componente por componente
  for (let i = 0; i < 3; i++) {
    const v1 = semVer1[i] || 0;
    const v2 = semVer2[i] || 0;
    
    if (v1 < v2) return -1;
    if (v1 > v2) return 1;
  }
  
  return 0; // Son iguales
};

/**
 * Comprueba si hay una actualización disponible
 * @returns true si version2 es más reciente que version1
 */
export const hasUpdate = (currentVersion: string, newVersion: string): boolean => {
  return compareVersions(currentVersion, newVersion) < 0;
};
