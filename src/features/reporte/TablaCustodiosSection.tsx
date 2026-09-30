import { type SortState } from '@ai27-tech/ui';
import { useMemo, useState } from 'react';

import type { EstadisticaCustodio } from '@/lib/datos/tipos';

import { TablaCustodios } from './TablaCustodios';
import { custodioSortValue, sortBy } from './tablaSort';

/**
 * Sección «Estadísticas por custodio»: encabezado + tabla ordenable. Recibe los datos ya
 * filtrados por `ReporteSection`; sólo mantiene el estado de orden, local a la tabla.
 */
export function TablaCustodiosSection({ porCustodio }: { porCustodio: EstadisticaCustodio[] }) {
  const [sort, setSort] = useState<SortState>({ key: 'totalMedios', direction: 'desc' });

  const visibles = useMemo(() => sortBy(porCustodio, sort, custodioSortValue), [porCustodio, sort]);

  return (
    <section aria-labelledby="custodios-titulo" className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="bg-surface-high text-text-muted rounded px-2 py-0.5 font-mono text-xs">
          02
        </span>
        <div>
          <h2 id="custodios-titulo" className="text-text text-sm font-semibold">
            Estadísticas por custodio
          </h2>
          <p className="text-text-muted text-xs">Actividad de cada custodio en el periodo.</p>
        </div>
      </div>

      <TablaCustodios datos={visibles} sort={sort} onSortChange={setSort} />
    </section>
  );
}
