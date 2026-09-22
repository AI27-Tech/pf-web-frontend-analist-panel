/**
 * Formateo de tamaños de archivo para la galería y el expediente.
 *
 * El panel muestra el peso de cada evidencia junto a su miniatura. Se formatea en la
 * unidad más legible (KB o MB) con una decimal, que es la precisión que le sirve a un
 * analista para distinguir un original de una miniatura sin ruido de dígitos.
 */

const KB = 1024;
const MB = KB * 1024;

/** Peso de un archivo como texto corto: `4.8 MB`, `512 KB`, `0 KB`. */
export function formatearBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / KB))} KB`;
}

/** Hora local de México en formato de 24 horas `HH:MM`, para la esquina de la celda. */
export function horaLocal(instante: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(instante);
}
