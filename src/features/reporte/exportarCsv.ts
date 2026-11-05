/**
 * Exportación a CSV del «Registro por viaje». Se reciben las filas que la tabla ya muestra
 * y devuelve texto, sin consultar datos nuevos.
 */

import Papa from 'papaparse';

import type { FilaViaje } from '@/lib/datos/tipos';
import type { RangoFechas } from '@/lib/formato/fechas';

import type { FiltroReporte } from './filtros';

/** Separador entre custodios dentro de una misma celda. */
const SEPARADOR_CUSTODIOS = ' | ';

/** Encabezados, en el orden de las columnas del archivo. */
const ENCABEZADOS = [
  'Unidad',
  'Numero economico',
  'Fecha',
  'Cantidad de fotos',
  'Cantidad de audios',
  'Total de evidencias',
] as const;

/** Celda de una tabla CSV. Los números se escriben tal cual; el texto se escapa. */
export type CeldaCsv = string | number;

/** Opciones de `Papa.unparse` compartidas por todos los reportes. */
const OPCIONES_CSV = { delimiter: ',', newline: '\r\n', escapeFormulae: true } as const;

/**
 * Arma un CSV a partir de encabezados y filas. Es el único punto donde se configura
 * `Papa.unparse`, para que todos los reportes compartan separador, saltos de línea y
 * neutralización de fórmulas.
 *
 * `escapeFormulae` sólo actúa sobre texto: un número negativo (p. ej. una longitud) se
 * escribe sin apóstrofo y Excel lo sigue leyendo como número.
 */
export function tablaACsv(encabezados: readonly string[], filas: CeldaCsv[][]): string {
  // Papa.unparse agrega un salto de línea final cuando no hay filas de datos; se evita
  // para que el resultado sea exactamente la fila de encabezados.
  if (filas.length === 0) return encabezados.join(',');

  return Papa.unparse({ fields: [...encabezados], data: filas }, OPCIONES_CSV);
}

/**
 * Convierte las filas del registro por viaje a texto CSV: una fila por viaje, en el
 * mismo orden recibido. Con lista vacía devuelve sólo la fila de encabezados.
 */
export function viajesACsv(viajes: FilaViaje[]): string {
  return tablaACsv(
    ENCABEZADOS,
    viajes.map((v) => [
      v.custodios.join(SEPARADOR_CUSTODIOS),
      v.placas,
      v.fechaLocal,
      v.fotos,
      v.audios,
      v.fotos + v.audios,
    ]),
  );
}

/** Deja un valor usable en un nombre de archivo: minúsculas, sin acentos, `[a-z0-9_-]`. */
export function sanearParaArchivo(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Nombre del archivo: `reporte_<desde>_<hasta>.csv`, más `_<placa>` si el filtro acota
 * por unidad y `_<custodio>` si acota por custodio. El filtro de texto libre no se
 * refleja: es un criterio variable que no identifica el archivo.
 *
 * `nombreCustodio` llega ya resuelto porque `filtro.custodio` guarda un `uid`, no el
 * nombre; si no se puede resolver (`null`), el custodio se omite del nombre.
 */
export function nombreArchivoCsv(
  rango: RangoFechas,
  filtro: FiltroReporte,
  nombreCustodio: string | null = null,
): string {
  const partes = ['reporte', rango.desde, rango.hasta];
  if (filtro.unidad !== null) partes.push(filtro.unidad);
  if (filtro.custodio !== null && nombreCustodio !== null) partes.push(nombreCustodio);
  // Cada parte se sanea por separado; las que quedan vacías se descartan.
  return `${partes.map(sanearParaArchivo).filter(Boolean).join('_')}.csv`;
}

/**
 * Dispara la descarga de un archivo en el navegador con un enlace temporal. Libera la URL
 * del objeto al terminar para no retener el contenido en memoria.
 */
export function descargarArchivo(nombre: string, contenido: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

const TIPO_CSV = 'text/csv;charset=utf-8';

/** Descarga un CSV tal cual, sin marca de orden de bytes (BOM). */
export function descargarCsv(nombre: string, csv: string): void {
  descargarArchivo(nombre, csv, TIPO_CSV);
}
