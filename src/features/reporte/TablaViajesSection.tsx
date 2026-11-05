import { Pagination, type SortState } from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import type { FilaViaje } from '@/lib/datos/tipos';

import { TablaViajes } from './TablaViajes';
import { sortBy, viajeSortValue } from './tablaSort';

const TAMANO_PAGINA_INICIAL = 10;

/**
 * Sección «Registro por viaje»: encabezado + tabla ordenable y paginada. Recibe los
 * datos ya filtrados por `ReporteSection`; sólo mantiene el estado de orden y de página,
 * local a la tabla. Clic en una fila abre el expediente del viaje.
 *
 * La paginación es en cliente: todos los viajes del periodo ya están en memoria, así que
 * primero se ordena el conjunto completo y después se corta la página. Ordenar por una
 * columna ordena TODO el registro, no sólo la página visible.
 */
export function TablaViajesSection({ porViaje }: { porViaje: FilaViaje[] }) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortState>({ key: 'fechaLocal', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(TAMANO_PAGINA_INICIAL);

  // Cambiar el filtro o el periodo entrega otro conjunto de viajes: se vuelve a la
  // primera página. Se ajusta durante el render (patrón de React para estado derivado de
  // una prop) para no pintar un cuadro con una página que ya no existe.
  const [conjuntoPrevio, setConjuntoPrevio] = useState(porViaje);
  if (conjuntoPrevio !== porViaje) {
    setConjuntoPrevio(porViaje);
    setPage(1);
  }

  const ordenados = useMemo(() => sortBy(porViaje, sort, viajeSortValue), [porViaje, sort]);

  const total = ordenados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const visibles = useMemo(
    () => ordenados.slice((paginaActual - 1) * pageSize, paginaActual * pageSize),
    [ordenados, paginaActual, pageSize],
  );

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
        onSortChange={(siguiente) => {
          setSort(siguiente);
          setPage(1);
        }}
        onAbrirViaje={(id) => void navigate({ to: '/viajes/$id', params: { id } })}
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
