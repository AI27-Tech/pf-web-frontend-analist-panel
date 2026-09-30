import { Badge, Table, type BadgeVariant, type Column, type SortState } from '@ai27-tech/ui';

import type { CicloViaje, FilaViaje } from '@/lib/datos/tipos';

/**
 * Tabla «Registro por viaje»: una fila por viaje del periodo, con placas, custodios
 * participantes, fecha, conteos de medios y ciclo. Ordenable; clic en fila navega al
 * expediente. Filtrable por custodio desde `ReporteTablas`.
 *
 * Presentacional: recibe los datos ya calculados y los callbacks.
 */
export interface TablaViajesProps {
  datos: FilaViaje[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  /** Abre el expediente del viaje. */
  onAbrirViaje: (id: string) => void;
}

/** Presentación del ciclo del viaje como Badge, alineada con `mapeoEstados` de Viajes. */
const CICLO: Record<CicloViaje, { etiqueta: string; variant: BadgeVariant }> = {
  ACTIVO: { etiqueta: 'Activo', variant: 'secure' },
  CERRADO: { etiqueta: 'Cerrado', variant: 'neutral' },
  DESCARTADO: { etiqueta: 'Descartado', variant: 'warning' },
};

/** Total de medios de un viaje: fotos + audios. Usado como clave de orden. */
function totalMedios(v: FilaViaje): number {
  return v.fotos + v.audios;
}

const columnas: Column<FilaViaje>[] = [
  {
    key: 'id',
    header: 'Folio',
    sortable: true,
    cell: (v) => <span className="font-mono text-xs">{v.id}</span>,
  },
  {
    key: 'placas',
    header: 'Placas',
    sortable: true,
    cell: (v) => <span className="text-text font-mono font-semibold">{v.placas}</span>,
  },
  {
    key: 'custodios',
    header: 'Custodio(s)',
    cell: (v) =>
      v.custodios.length === 0 ? (
        <span className="text-text-muted text-xs">Sin custodio</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {v.custodios.map((nombre) => (
            <Badge key={nombre} variant="neutral" truncate="10rem">
              {nombre}
            </Badge>
          ))}
        </div>
      ),
  },
  { key: 'fechaLocal', header: 'Fecha', accessor: 'fechaLocal', sortable: true },
  { key: 'fotos', header: 'Fotos', accessor: 'fotos', align: 'right', sortable: true },
  { key: 'audios', header: 'Audios', accessor: 'audios', align: 'right', sortable: true },
  {
    key: 'totalMedios',
    header: 'Total',
    align: 'right',
    sortable: true,
    cell: (v) => <span className="cifras-tabulares">{totalMedios(v)}</span>,
  },
  {
    key: 'ciclo',
    header: 'Estado',
    sortable: true,
    cell: (v) => <Badge variant={CICLO[v.ciclo].variant}>{CICLO[v.ciclo].etiqueta}</Badge>,
  },
];

export function TablaViajes({ datos, sort, onSortChange, onAbrirViaje }: TablaViajesProps) {
  return (
    <Table
      aria-label="Registro por viaje"
      columns={columnas}
      data={datos}
      rowKey={(v) => v.id}
      sort={sort}
      onSortChange={onSortChange}
      onRowClick={(v) => onAbrirViaje(v.id)}
      density="compact"
      emptyState="No hay viajes en el periodo para el filtro seleccionado."
    />
  );
}
