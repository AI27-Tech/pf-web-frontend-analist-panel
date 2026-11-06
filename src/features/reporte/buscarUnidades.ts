/**
 * Búsqueda de unidades (custodios) por nombre para el buscador del modal de reportes.
 * Es lógica pura: coincidencia parcial normalizada, la misma que usan los filtros de la
 * página (sin acentos ni mayúsculas).
 */

import { normalizar } from '@/lib/datos/viajesQuery';
import type { EstadisticaCustodio } from '@/lib/datos/tipos';

/**
 * Unidades cuyo nombre contiene el texto, en orden alfabético. Con texto vacío devuelve
 * todas, para que el buscador funcione también como lista de opciones.
 */
export function buscarUnidades(
  custodios: EstadisticaCustodio[],
  texto: string,
): EstadisticaCustodio[] {
  const criterio = normalizar(texto.trim());

  return custodios
    .filter((c) => normalizar(c.nombre).includes(criterio))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
