import { Table, type Column, type SortState } from '@ai27-tech/ui';

import type { EstadisticaCustodio } from '@/lib/datos/tipos';

/**
 * Tabla «Estadísticas por custodio»: una fila por custodio del periodo, con sus conteos
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
  /** `uid` del custodio seleccionado para el filtro cruzado, o `null`. */
  seleccionado: string | null;
  /** Alterna la selección de un custodio (clic en su fila). */
  onSeleccionar: (uid: string) => void;
}

/** Total de medios de un custodio: fotos + audios. */
function totalMedios(c: EstadisticaCustodio): number {
  return c.fotos + c.audios;
}

const columnas: Column<EstadisticaCustodio>[] = [
  { key: 'nombre', header: 'Custodio', accessor: 'nombre', sortable: true },
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

export function TablaCustodios({
  datos,
  sort,
  onSortChange,
  seleccionado,
  onSeleccionar,
}: TablaCustodiosProps) {
  return (
    <Table
      aria-label="Estadísticas por custodio"
      columns={columnas}
      data={datos}
      rowKey={(c) => c.uid}
      sort={sort}
      onSortChange={onSortChange}
      onRowClick={(c) => onSeleccionar(c.uid)}
      {...(seleccionado ? { selectedKeys: new Set([seleccionado]) } : {})}
      density="compact"
      emptyState="No hay custodios con actividad en el periodo."
    />
  );
}
