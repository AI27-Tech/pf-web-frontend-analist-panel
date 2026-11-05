/**
 * Reportes CSV adicionales del panel: reporte de unidad (una fila por archivo), rankings
 * y actividad. Es lógica pura: los rankings y la actividad se calculan con los agregados
 * que ya trajo `obtenerMetricas`; sólo el reporte de unidad necesita medios, que llegan
 * por parámetro.
 *
 * En la interfaz, «Unidad» es el custodio (`EstadisticaCustodio.nombre`) y «Número
 * económico» son las placas (`FilaViaje.placas`). Los identificadores de código usan
 * `custodio` y `placas`; los encabezados de los CSV usan los nombres de la interfaz.
 *
 * Los rankings y la actividad cubren todo el periodo: ignoran los filtros de la página,
 * porque un ranking sobre una selección filtrada no tiene sentido.
 */

import type { EstadisticaCustodio, FilaViaje, Medio, TipoMedio } from '@/lib/datos/tipos';
import type { RangoFechas } from '@/lib/formato/fechas';

import { sanearParaArchivo, tablaACsv, type CeldaCsv } from './exportarCsv';

const MS_POR_DIA = 86_400_000;

const TIPO_ARCHIVO: Record<TipoMedio, string> = { FOTO: 'Foto', AUDIO: 'Audio' };

/** Redondea a dos decimales para los promedios. */
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Orden alfabético en español, para desempatar de forma estable. */
function porNombre(a: string, b: string): number {
  return a.localeCompare(b, 'es');
}

/**
 * Posición de cada valor en un ranking descendente. Los empates comparten posición y la
 * siguiente se salta (1, 2, 2, 4), que es como se lee un ranking deportivo.
 */
function posiciones(valores: number[]): number[] {
  const descendente = [...valores].sort((a, b) => b - a);
  return valores.map((v) => descendente.indexOf(v) + 1);
}

/** Todas las fechas `YYYY-MM-DD` del rango, ambos extremos incluidos. Vacío si es inválido. */
export function diasDelRango(rango: RangoFechas): string[] {
  const dias: string[] = [];
  const fin = Date.parse(`${rango.hasta}T00:00:00Z`);
  for (let t = Date.parse(`${rango.desde}T00:00:00Z`); t <= fin; t += MS_POR_DIA) {
    dias.push(new Date(t).toISOString().slice(0, 10));
  }
  return dias;
}

/**
 * Nombre de archivo: `<prefijo>[_<sujeto>]_<desde>_<hasta>.csv`. Cada parte se sanea por
 * separado a `[a-z0-9_-]` y las que quedan vacías se descartan.
 */
export function nombreArchivoReporte(prefijo: string, rango: RangoFechas, sujeto?: string): string {
  const partes = [prefijo, sujeto ?? '', rango.desde, rango.hasta];
  return `${partes.map(sanearParaArchivo).filter(Boolean).join('_')}.csv`;
}

// ---------------------------------------------------------------------------
// Reporte de unidad: una fila por archivo
// ---------------------------------------------------------------------------

const ENCABEZADOS_UNIDAD = [
  'Numero economico',
  'Tipo de archivo',
  'Fecha',
  'Hora',
  'Latitud',
  'Longitud',
] as const;

/** Zona horaria en la que la app de campo escribe `fechaLocal`; la hora debe ir en la misma. */
const ZONA_MX = 'America/Mexico_City';

const formatoHora = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA_MX,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * Hora de captura (`HH:mm:ss`) en zona de México, para que coincida con `fechaLocal`.
 * Queda vacía si el medio no trae hora: `aMedio` rellena con la época (1970) cuando falta
 * `createdAtDevice`, y mostrarla como una hora real sería un dato inventado.
 */
function horaLocalDe(instante: Date): string {
  return instante.getTime() === 0 ? '' : formatoHora.format(instante);
}

/**
 * Reporte de una unidad: una fila por archivo (foto o audio) subido, sin título ni líneas
 * en blanco, para que el CSV sea una tabla limpia. La unidad va en el nombre del archivo
 * (`nombreArchivoReporte`). Las filas van ordenadas por fecha y luego por hora de captura.
 *
 * Latitud y longitud quedan vacías cuando el medio no trae GPS.
 */
export function reporteUnidadACsv(medios: Medio[]): string {
  const ordenados = [...medios].sort(
    (a, b) =>
      a.fechaLocal.localeCompare(b.fechaLocal) ||
      a.capturadoEn.getTime() - b.capturadoEn.getTime() ||
      a.id.localeCompare(b.id),
  );

  return tablaACsv(
    ENCABEZADOS_UNIDAD,
    ordenados.map((m) => [
      m.placas,
      TIPO_ARCHIVO[m.tipo],
      m.fechaLocal,
      horaLocalDe(m.capturadoEn),
      m.ubicacion?.latitud ?? '',
      m.ubicacion?.longitud ?? '',
    ]),
  );
}

// ---------------------------------------------------------------------------
// Rankings
// ---------------------------------------------------------------------------

const ENCABEZADOS_RANKING_UNIDADES = [
  'Unidad',
  'Seguimientos',
  'Fotos',
  'Audios',
  'Total de evidencias',
  'Promedio de fotos por seguimiento',
  'Posicion por seguimientos',
  'Posicion por fotos',
  'Posicion por audios',
  'Posicion por total',
] as const;

/**
 * Ranking de unidades (custodios) con una posición por cada métrica. Va ordenado por
 * fotos, desempatando por total y luego por nombre. El promedio de fotos por seguimiento
 * queda vacío si la unidad no tiene seguimientos en el periodo.
 */
export function rankingUnidadesACsv(porCustodio: EstadisticaCustodio[]): string {
  const totales = porCustodio.map((c) => c.fotos + c.audios);
  const posViajes = posiciones(porCustodio.map((c) => c.viajes));
  const posFotos = posiciones(porCustodio.map((c) => c.fotos));
  const posAudios = posiciones(porCustodio.map((c) => c.audios));
  const posTotal = posiciones(totales);

  const filas = porCustodio
    .map((c, i) => ({
      c,
      total: totales[i] ?? 0,
      posiciones: [posViajes[i] ?? 0, posFotos[i] ?? 0, posAudios[i] ?? 0, posTotal[i] ?? 0],
    }))
    .sort((a, b) => b.c.fotos - a.c.fotos || b.total - a.total || porNombre(a.c.nombre, b.c.nombre))
    .map(({ c, total, posiciones: pos }): CeldaCsv[] => [
      c.nombre,
      c.viajes,
      c.fotos,
      c.audios,
      total,
      c.viajes === 0 ? '' : redondear(c.fotos / c.viajes),
      ...pos,
    ]);

  return tablaACsv(ENCABEZADOS_RANKING_UNIDADES, filas);
}

const ENCABEZADOS_RANKING_PLACAS = [
  'Numero economico',
  'Seguimientos',
  'Fotos',
  'Audios',
  'Total de evidencias',
  'Unidades distintas',
] as const;

/**
 * Ranking de números económicos, calculado desde el registro por viaje. Va ordenado por
 * viajes, desempatando por total y luego por número. Los viajes sin placas se omiten,
 * igual que en la gráfica «viajes por unidad».
 *
 * «Unidades distintas» cuenta los custodios diferentes que participaron en esa placa.
 */
export function rankingNumerosEconomicosACsv(porViaje: FilaViaje[]): string {
  const porPlaca = new Map<
    string,
    { viajes: number; fotos: number; audios: number; unidades: Set<string> }
  >();

  for (const v of porViaje) {
    if (v.placas === '') continue;
    let acc = porPlaca.get(v.placas);
    if (!acc) {
      acc = { viajes: 0, fotos: 0, audios: 0, unidades: new Set() };
      porPlaca.set(v.placas, acc);
    }
    acc.viajes += 1;
    acc.fotos += v.fotos;
    acc.audios += v.audios;
    for (const nombre of v.custodios) acc.unidades.add(nombre);
  }

  const filas = [...porPlaca.entries()]
    .map(([placas, a]) => ({ placas, a, total: a.fotos + a.audios }))
    .sort((x, y) => y.a.viajes - x.a.viajes || y.total - x.total || porNombre(x.placas, y.placas))
    .map(({ placas, a, total }): CeldaCsv[] => [
      placas,
      a.viajes,
      a.fotos,
      a.audios,
      total,
      a.unidades.size,
    ]);

  return tablaACsv(ENCABEZADOS_RANKING_PLACAS, filas);
}

// ---------------------------------------------------------------------------
// Actividad
// ---------------------------------------------------------------------------

const ENCABEZADOS_ACTIVIDAD_DIA = [
  'Fecha',
  'Seguimientos',
  'Fotos',
  'Audios',
  'Total de evidencias',
  'Numeros economicos activos',
] as const;

/**
 * Actividad por día del periodo. Incluye todos los días del rango, con ceros donde no
 * hubo viajes. Un viaje cuenta en su `fechaLocal` (el día en que se abrió), aunque se
 * cierre después.
 */
export function actividadPorDiaACsv(porViaje: FilaViaje[], rango: RangoFechas): string {
  const porDia = new Map(
    diasDelRango(rango).map((dia) => [
      dia,
      {
        viajes: 0,
        fotos: 0,
        audios: 0,
        placas: new Set<string>(),
      },
    ]),
  );

  for (const v of porViaje) {
    const acc = porDia.get(v.fechaLocal);
    if (!acc) continue;
    acc.viajes += 1;
    acc.fotos += v.fotos;
    acc.audios += v.audios;
    if (v.placas !== '') acc.placas.add(v.placas);
  }

  const filas = [...porDia.entries()].map(([dia, a]): CeldaCsv[] => [
    dia,
    a.viajes,
    a.fotos,
    a.audios,
    a.fotos + a.audios,
    a.placas.size,
  ]);

  return tablaACsv(ENCABEZADOS_ACTIVIDAD_DIA, filas);
}

const ENCABEZADOS_ACTIVIDAD_UNIDAD = [
  'Unidad',
  'Dias activos',
  'Dias sin actividad',
  'Primera fecha',
  'Ultima fecha',
  'Seguimientos',
  'Total de evidencias',
  'Promedio evidencias por seguimiento',
] as const;

/**
 * Actividad por unidad. Una fila por unidad de `porCustodio`.
 *
 * - Un «día activo» es un día con un viaje en el que la unidad participó
 *   (`FilaViaje.custodios`). El cruce es por NOMBRE, como en `filtros.ts`; si dos
 *   custodios comparten nombre, sus días se mezclan.
 * - `Seguimientos` y `Total de evidencias` salen de `porCustodio`, que los cuenta por uid. No
 *   se suman desde `porViaje` porque un viaje con varios custodios se contaría completo
 *   para cada uno.
 * - `Promedio evidencias por seguimiento` es el total de evidencias entre los
 *   seguimientos de la unidad.
 * - Una unidad sin días activos deja vacías las fechas, y una sin viajes deja vacío el
 *   promedio.
 *
 * Va ordenado por días activos, desempatando por total y luego por nombre.
 */
export function actividadPorUnidadACsv(
  porCustodio: EstadisticaCustodio[],
  porViaje: FilaViaje[],
  rango: RangoFechas,
): string {
  const diasPeriodo = diasDelRango(rango);
  const diasValidos = new Set(diasPeriodo);

  const diasPorNombre = new Map<string, Set<string>>();
  for (const v of porViaje) {
    if (!diasValidos.has(v.fechaLocal)) continue;
    for (const nombre of v.custodios) {
      let dias = diasPorNombre.get(nombre);
      if (!dias) {
        dias = new Set();
        diasPorNombre.set(nombre, dias);
      }
      dias.add(v.fechaLocal);
    }
  }

  const filas = porCustodio
    .map((c) => {
      const dias = [...(diasPorNombre.get(c.nombre) ?? [])].sort();
      return { c, dias, total: c.fotos + c.audios };
    })
    .sort(
      (a, b) =>
        b.dias.length - a.dias.length || b.total - a.total || porNombre(a.c.nombre, b.c.nombre),
    )
    .map(({ c, dias, total }): CeldaCsv[] => [
      c.nombre,
      dias.length,
      diasPeriodo.length - dias.length,
      dias[0] ?? '',
      dias[dias.length - 1] ?? '',
      c.viajes,
      total,
      c.viajes === 0 ? '' : redondear(total / c.viajes),
    ]);

  return tablaACsv(ENCABEZADOS_ACTIVIDAD_UNIDAD, filas);
}
