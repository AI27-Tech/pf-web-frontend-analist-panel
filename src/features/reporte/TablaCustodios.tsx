import { Table, type Column, type SortState } from '@ai27-tech/ui';

import type { EstadisticaCustodio } from '@/lib/datos/tipos';

/**
 * Tabla «Estadísticas por unidad»: una fila por unidad del periodo, con sus conteos
 * de viajes, fotos, audios y el total de medios (calculado aquí). Ordenable por cualquier
 * columna; el orden por defecto (total de medios descendente) lo decide `ReporteTablas`.
 *
 * Presentacional: recibe los datos ya calculados por `lib/datos/metricas`, el estado de
 * orden y los callbacks. No consulta ni ordena por su cuenta.
 */
export interface TablaCustodiosProps {
  datos: EstadisticaCustodio[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
}

/** Total de medios de un custodio: fotos + audios. */
function totalMedios(c: EstadisticaCustodio): number {
  return c.fotos + c.audios;
}

const columnas: Column<EstadisticaCustodio>[] = [
  { key: 'nombre', header: 'Unidad', accessor: 'nombre', sortable: true },
  { key: 'viajes', header: 'Viajes', accessor: 'viajes', align: 'right', sortable: true },
  { key: 'fotos', header: 'Fotos', accessor: 'fotos', align: 'right', sortable: true },
  { key: 'audios', header: 'Audios', accessor: 'audios', align: 'right', sortable: true },
  {
    key: 'totalMedios',
    header: 'Total medios',
    align: 'right',
    sortable: true,
    cell: (c) => <span className="cifras-tabulares font-semibold">{totalMedios(c)}</span>,
  },
];

export function TablaCustodios({ datos, sort, onSortChange }: TablaCustodiosProps) {
  return (
    <Table
      aria-label="Estadísticas por unidad"
      columns={columnas}
      data={datos}
      rowKey={(c) => c.uid}
      sort={sort}
      onSortChange={onSortChange}
      density="compact"
      emptyState="No hay unidades con actividad en el periodo."
    />
  );
}
