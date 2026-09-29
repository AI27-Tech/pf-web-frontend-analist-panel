import { type SortState } from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import type { FilaViaje } from '@/lib/datos/tipos';

import { TablaViajes } from './TablaViajes';
import { sortBy, viajeSortValue } from './tablaSort';

/**
 * Sección «Registro por viaje»: encabezado + tabla ordenable. Recibe los datos ya
 * filtrados por `ReporteSection`; sólo mantiene el estado de orden, local a la tabla.
 * Clic en una fila abre el expediente del viaje.
 */
export function TablaViajesSection({ porViaje }: { porViaje: FilaViaje[] }) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortState>({ key: 'fechaLocal', direction: 'desc' });

  const visibles = useMemo(() => sortBy(porViaje, sort, viajeSortValue), [porViaje, sort]);

  return (
    <section aria-labelledby="viajes-titulo" className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="bg-surface-high text-text-muted rounded px-2 py-0.5 font-mono text-xs">
          04
        </span>
        <div className="flex-1">
          <h2 id="viajes-titulo" className="text-text text-sm font-semibold">
            Registro por viaje
          </h2>
          <p className="text-text-muted text-xs">
            Un renglón por viaje del periodo. Haz clic en un viaje para abrir su expediente.
          </p>
        </div>
      </div>

      <TablaViajes
        datos={visibles}
        sort={sort}
        onSortChange={setSort}
        onAbrirViaje={(id) => void navigate({ to: '/viajes/$id', params: { id } })}
      />
    </section>
  );
}
