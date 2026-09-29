import type { SortState } from '@ai27-tech/ui';

import type { EstadisticaCustodio, FilaViaje } from '@/lib/datos/tipos';

/**
 * Ordenamiento en cliente de las tablas del reporte. La `Table` de la librería controla
 * el estado de orden (`sort`/`onSortChange`) pero no ordena los datos, así que cada tabla
 * ordena su copia con `sortBy` y una función que extrae el valor de la columna.
 */

/** Valor de una columna de custodio para ordenar. `totalMedios` es derivado. */
export function custodioSortValue(c: EstadisticaCustodio, key: string): number | string {
  switch (key) {
    case 'nombre':
      return c.nombre.toLowerCase();
    case 'totalMedios':
      return c.fotos + c.audios;
    case 'viajes':
      return c.viajes;
    case 'fotos':
      return c.fotos;
    case 'audios':
      return c.audios;
    default:
      return c.nombre.toLowerCase();
  }
}

/** Valor de una columna de viaje para ordenar. */
export function viajeSortValue(v: FilaViaje, key: string): number | string {
  switch (key) {
    case 'totalMedios':
      return v.fotos + v.audios;
    case 'fotos':
      return v.fotos;
    case 'audios':
      return v.audios;
    case 'placas':
      return v.placas.toLowerCase();
    case 'ciclo':
      return v.ciclo;
    case 'id':
      return v.id;
    case 'fechaLocal':
    default:
      return v.fechaLocal;
  }
}

/** Ordena una copia de `data` según `sort`, usando `valueOf` para extraer la clave. */
export function sortBy<T>(
  data: T[],
  sort: SortState,
  valueOf: (row: T, key: string) => number | string,
): T[] {
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...data].sort((a, b) => {
    const va = valueOf(a, sort.key);
    const vb = valueOf(b, sort.key);
    if (va < vb) return -1 * factor;
    if (va > vb) return 1 * factor;
    return 0;
  });
}
