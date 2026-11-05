/**
 * Exportación a CSV del «Registro por viaje». Se reciben las filas que la tabla ya muestra
 * y devuelve texto, sin consultar datos nuevos.
 */

import Papa from 'papaparse';

import type { CicloViaje, FilaViaje } from '@/lib/datos/tipos';
import type { RangoFechas } from '@/lib/formato/fechas';

import type { FiltroReporte } from './filtros';

/**
 * Marca de orden de bytes UTF-8. Excel la usa para detectar la codificación; sin ella
 * interpreta el archivo como ANSI y rompe los acentos.
 */
export const BOM_UTF8 = '\uFEFF';

/** Separador entre custodios dentro de una misma celda. */
const SEPARADOR_CUSTODIOS = ' | ';

/** Etiqueta legible del ciclo; replica la que muestra la tabla en pantalla. */
const ETIQUETA_CICLO: Record<CicloViaje, string> = {
  ACTIVO: 'Activo',
  CERRADO: 'Cerrado',
  DESCARTADO: 'Descartado',
};

/** Encabezados, en el orden de las columnas del archivo. */
const ENCABEZADOS = [
  'Unidad',
  'Numero economico',
  'Fecha',
  'Cantidad de fotos',
  'Cantidad de audios',
  'Total de evidencias',
  'Estado',
] as const;

/**
 * Convierte las filas del registro por viaje a texto CSV: una fila por viaje, en el
 * mismo orden recibido. Con lista vacía devuelve sólo la fila de encabezados.
 */
export function viajesACsv(viajes: FilaViaje[]): string {
  // Papa.unparse agrega un salto de línea final cuando no hay filas de datos; se evita
  // para que el resultado sea exactamente la fila de encabezados.
  if (viajes.length === 0) return ENCABEZADOS.join(',');

  const filas = viajes.map((v) => [
    v.custodios.join(SEPARADOR_CUSTODIOS),
    v.placas,
    v.fechaLocal,
    v.fotos,
    v.audios,
    v.fotos + v.audios,
    ETIQUETA_CICLO[v.ciclo],
  ]);

  return Papa.unparse(
    { fields: [...ENCABEZADOS], data: filas },
    { delimiter: ',', newline: '\r\n', escapeFormulae: true },
  );
}

/** Deja una placa usable en un nombre de archivo. */
function sanearParaArchivo(valor: string): string {
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
