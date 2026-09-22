import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { EncabezadoPagina } from '@/components/EncabezadoPagina';
import { listarEtiquetas } from '@/lib/datos/catalogos';
import type { FiltrosViaje } from '@/lib/datos/tipos';
import { listarViajes } from '@/lib/datos/viajes';
import { resolverPeriodo, type SeleccionPeriodo } from '@/lib/formato/fechas';

import { ViajesFilters } from '@/features/viajes/ViajesFilters';
import { ViajesList } from '@/features/viajes/ViajesList';

export const Route = createFileRoute('/_privado/viajes')({
  component: Pantalla_Viajes,
});

/** Los criterios de `FiltrosViaje`. */
type CriteriosSueltos = Pick<FiltrosViaje, 'placas' | 'custodioName' | 'etiqueta' | 'isUpdated'>;

function Pantalla_Viajes() {
  // El periodo inicial es «Este mes».
  const [periodo, setPeriodo] = useState<SeleccionPeriodo>({ atajo: 'mes' });
  const [criterios, setCriterios] = useState<CriteriosSueltos>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { desde, hasta } = resolverPeriodo(periodo);

  // Objeto derivado que la capa de datos y `ViajesFilters` consumen.
  const filtros: FiltrosViaje = { desde, hasta, ...criterios, page, pageSize };

  const consultaViajes = useQuery({
    queryKey: ['viajes', filtros],
    queryFn: () => listarViajes(filtros),
  });

  const consultaEtiquetas = useQuery({
    queryKey: ['etiquetas'],
    queryFn: () => listarEtiquetas(),
  });

  const estado: 'cargando' | 'listo' | 'error' = consultaViajes.isPending
    ? 'cargando'
    : consultaViajes.isError
      ? 'error'
      : 'listo';

  function handleFiltrosChange(nuevosFiltros: FiltrosViaje) {
    setPeriodo({ atajo: 'rango', desde: nuevosFiltros.desde, hasta: nuevosFiltros.hasta });
    setCriterios({
      ...(nuevosFiltros.placas !== undefined ? { placas: nuevosFiltros.placas } : {}),
      ...(nuevosFiltros.custodioName !== undefined
        ? { custodioName: nuevosFiltros.custodioName }
        : {}),
      ...(nuevosFiltros.etiqueta !== undefined ? { etiqueta: nuevosFiltros.etiqueta } : {}),
      ...(nuevosFiltros.isUpdated !== undefined ? { isUpdated: nuevosFiltros.isUpdated } : {}),
    });
    // Cualquier cambio de filtro reinicia la página a 1.
    setPage(1);
  }

  function handlePageSizeChange(nuevoPageSize: number) {
    setPageSize(nuevoPageSize);
    setPage(1);
  }

  function handleAbrirViaje(id: string) {
    // La ruta de detalle no se declara en esta entrega (fuera de alcance de
    // viajes-lista): sólo se registra la intención, sin navegar y sin error.
    console.info('Abrir viaje (pendiente de ruta de detalle):', id);
  }

  function handleLimpiarFiltros() {
    const nuevoPeriodo: SeleccionPeriodo = { atajo: 'mes' };
    setPeriodo(nuevoPeriodo);
    setCriterios({});
    setPage(1);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EncabezadoPagina titulo="Viajes" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-8 py-6">
        <ViajesFilters
          filtros={filtros}
          onFiltrosChange={handleFiltrosChange}
          etiquetas={consultaEtiquetas.data ?? []}
        />
        <ViajesList
          viajes={consultaViajes.data?.viajes ?? []}
          total={consultaViajes.data?.total ?? 0}
          estado={estado}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          onAbrirViaje={handleAbrirViaje}
          onReintentar={() => consultaViajes.refetch()}
          onLimpiarFiltros={handleLimpiarFiltros}
          periodo={{ desde, hasta }}
        />
      </div>
    </div>
  );
}
