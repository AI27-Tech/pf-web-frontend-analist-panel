/**
 * Filtrado en cliente de las tablas del reporte (Plan A). Es lógica pura: recibe los
 * agregados que ya calculó `lib/datos/metricas` y devuelve subconjuntos, sin tocar la
 * capa de datos ni consultar Firestore.
 *
 * Los tres criterios se combinan con AND:
 *  - `texto`: coincidencia parcial normalizada (sin acentos ni mayúsculas) sobre el
 *    nombre del custodio y las placas.
 *  - `custodio`: `uid` de un custodio seleccionado.
 *  - `unidad`: placa seleccionada.
 *
 * El buscador y los filtros actúan SÓLO sobre las tablas; las gráficas se quedan como
 * panorama fijo del periodo.
 */

import { normalizar } from '@/lib/datos/viajesQuery';
import type { EstadisticasReporte } from '@/lib/datos/metricas';
import type { EstadisticaCustodio, FilaViaje } from '@/lib/datos/tipos';

/** Estado de filtro unificado de las tablas del reporte. */
export interface FiltroReporte {
  /** Texto libre del buscador. Cadena vacía = sin criterio de texto. */
  texto: string;
  /** `uid` del custodio seleccionado, o `null` si no hay. */
  custodio: string | null;
  /** Placa seleccionada, o `null` si no hay. */
  unidad: string | null;
}

/** Filtro sin ningún criterio activo. */
export const FILTRO_VACIO: FiltroReporte = { texto: '', custodio: null, unidad: null };

/** `true` si al menos un criterio está activo. */
export function hayFiltroActivo(filtro: FiltroReporte): boolean {
  return filtro.texto.trim() !== '' || filtro.custodio !== null || filtro.unidad !== null;
}

/** Coincidencia parcial normalizada de un valor contra el criterio de texto. */
function coincide(valor: string, criterio: string): boolean {
  return normalizar(valor).includes(normalizar(criterio));
}

/**
 * Filtra la tabla de custodios.
 *
 * - `texto`: el nombre del custodio contiene el criterio.
 * - `custodio`: es exactamente ese `uid`.
 * - `unidad`: el custodio participó en algún viaje de esa placa. Ese cruce necesita
 *   `porViaje`, porque `EstadisticaCustodio` no conoce placas por sí solo; se resuelve
 *   por el nombre del custodio, que es lo que `FilaViaje.custodios` guarda.
 */
export function filtrarCustodios(
  custodios: EstadisticaCustodio[],
  filtro: FiltroReporte,
  porViaje: FilaViaje[],
): EstadisticaCustodio[] {
  const criterio = filtro.texto.trim();

  // Nombres de custodio que participaron en la placa seleccionada (si hay una).
  const nombresEnUnidad =
    filtro.unidad === null
      ? null
      : new Set(porViaje.filter((v) => v.placas === filtro.unidad).flatMap((v) => v.custodios));

  return custodios.filter((c) => {
    if (criterio !== '' && !coincide(c.nombre, criterio)) return false;
    if (filtro.custodio !== null && c.uid !== filtro.custodio) return false;
    if (nombresEnUnidad !== null && !nombresEnUnidad.has(c.nombre)) return false;
    return true;
  });
}

/**
 * Filtra la tabla de registro por viaje.
 *
 * - `texto`: las placas o alguno de los nombres de custodio contienen el criterio.
 * - `custodio`: el viaje incluye al custodio seleccionado. El cruce es por NOMBRE, porque
 *   `FilaViaje.custodios` guarda nombres resueltos, no uids; el nombre se obtiene de
 *   `porCustodio`.
 * - `unidad`: la placa del viaje es exactamente la seleccionada.
 */
export function filtrarViajes(
  viajes: FilaViaje[],
  filtro: FiltroReporte,
  porCustodio: EstadisticaCustodio[],
): FilaViaje[] {
  const criterio = filtro.texto.trim();

  const nombreCustodio =
    filtro.custodio === null
      ? null
      : (porCustodio.find((c) => c.uid === filtro.custodio)?.nombre ?? null);

  return viajes.filter((v) => {
    if (criterio !== '') {
      const enPlacas = coincide(v.placas, criterio);
      const enCustodios = v.custodios.some((nombre) => coincide(nombre, criterio));
      if (!enPlacas && !enCustodios) return false;
    }
    if (nombreCustodio !== null && !v.custodios.includes(nombreCustodio)) return false;
    if (filtro.unidad !== null && v.placas !== filtro.unidad) return false;
    return true;
  });
}

const enteros = new Intl.NumberFormat('es-MX');

/**
 * Recalcula las tres tarjetas de cabecera a partir de un conjunto de viajes ya filtrado.
 *
 * Se usa SÓLO cuando hay un filtro activo: entonces las tarjetas dejan de mostrar el
 * panorama global (que viene precalculado de `lib/datos/metricas`, con su delta vs. el
 * periodo anterior) y pasan a resumir lo filtrado. El `delta` va en `null` a propósito:
 * un subconjunto filtrado no tiene un «periodo anterior» comparable, así que la tarjeta
 * oculta la variación en vez de inventar una.
 */
export function estadisticasDeViajes(viajes: FilaViaje[]): EstadisticasReporte {
  const auditados = viajes.length;
  const incidencias = viajes.filter((v) => v.hayNovedad).length;
  const fotos = viajes.reduce((suma, v) => suma + v.fotos, 0);

  return {
    viajesAuditados: {
      valor: enteros.format(auditados),
      delta: null,
      contexto: 'en la selección',
    },
    incidenciasRegistradas: {
      valor: enteros.format(incidencias),
      delta: null,
      contexto: 'eventos con novedad',
    },
    evidenciasFotograficas: {
      valor: enteros.format(fotos),
      delta: null,
      contexto: 'archivos capturados en ruta',
    },
  };
}
