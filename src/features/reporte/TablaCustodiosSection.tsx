import { Pagination, type SortState } from '@ai27-tech/ui';
import { useMemo, useState } from 'react';

import type { EstadisticaCustodio } from '@/lib/datos/tipos';

import { TablaCustodios } from './TablaCustodios';
import { custodioSortValue, sortBy } from './tablaSort';

const TAMANO_PAGINA_INICIAL = 10;

/**
 * Sección «Estadísticas por custodio»: encabezado + tabla ordenable y paginada, igual
 * que «Registro por seguimiento». Recibe los datos ya filtrados por `ReporteSection`;
 * sólo mantiene el estado de orden y de página, local a la tabla.
 */
export function TablaCustodiosSection({ porCustodio }: { porCustodio: EstadisticaCustodio[] }) {
  const [sort, setSort] = useState<SortState>({ key: 'totalMedios', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(TAMANO_PAGINA_INICIAL);

  // Cambiar el filtro o el periodo entrega otro conjunto de unidades: se vuelve a la
  // primera página, como en «Registro por seguimiento».
  const [conjuntoPrevio, setConjuntoPrevio] = useState(porCustodio);
  if (conjuntoPrevio !== porCustodio) {
    setConjuntoPrevio(porCustodio);
    setPage(1);
  }

  const ordenados = useMemo(
    () => sortBy(porCustodio, sort, custodioSortValue),
    [porCustodio, sort],
  );

  const total = ordenados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const visibles = useMemo(
    () => ordenados.slice((paginaActual - 1) * pageSize, paginaActual * pageSize),
    [ordenados, paginaActual, pageSize],
  );

  return (
    <section aria-labelledby="custodios-titulo" className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="bg-surface-high text-text-muted rounded px-2 py-0.5 font-mono text-xs">
          02
        </span>
        <div>
          <h2 id="custodios-titulo" className="text-text text-sm font-semibold">
            Estadísticas por unidad
          </h2>
          <p className="text-text-muted text-xs">Actividad de cada unidad en el periodo.</p>
        </div>
      </div>

      <TablaCustodios
        datos={visibles}
        sort={sort}
        onSortChange={(siguiente) => {
          setSort(siguiente);
          setPage(1);
        }}
      />

      {total > 0 && (
        <div className="no-imprimir">
          <Pagination
            page={paginaActual}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(tamano) => {
              setPageSize(tamano);
              setPage(1);
            }}
          />
        </div>
      )}
    </section>
  );
}
