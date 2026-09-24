import { Button, Pagination } from '@ai27-tech/ui';
import { AlertTriangle, SearchX } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { Viaje } from '@/lib/datos/tipos';

import { ViajeCard } from './ViajeCard';
import { ViajesListSkeleton } from './ViajesListSkeleton';

/** Rango de fechas del periodo vigente. */
interface RangoFechas {
  desde: string;
  hasta: string;
}

export interface ViajesListProps {
  viajes: Viaje[];
  total: number;
  estado: 'cargando' | 'listo' | 'error';
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onAbrirViaje: (id: string) => void;
  onReintentar: () => void;
  onLimpiarFiltros: () => void;
  periodo: RangoFechas;
}

export function ViajesList({
  viajes,
  total,
  estado,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onAbrirViaje,
  onReintentar,
  onLimpiarFiltros,
  periodo,
}: ViajesListProps) {
  const areaRenglones = useRef<HTMLUListElement>(null);

  useEffect(() => {
    areaRenglones.current?.scrollTo({ top: 0 });
  }, [page]);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 pb-3">
        <h2 className="text-text-muted font-mono text-xs tracking-widest uppercase">
          Expedientes registrados
        </h2>
        <p className="text-text-muted cifras-tabulares text-xs" aria-live="polite">
          Mostrando {viajes.length} de {new Intl.NumberFormat('es-MX').format(total)} viajes
        </p>
      </header>

      <ul ref={areaRenglones} className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {estado === 'cargando' && <ViajesListSkeleton count={pageSize} />}

        {estado === 'listo' && viajes.length === 0 && (
          <li className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <SearchX className="text-text-muted size-8" aria-hidden="true" />
            <p className="text-text-muted text-sm">
              No hay viajes entre el {periodo.desde} y el {periodo.hasta} con los filtros
              actuales.
            </p>
            <Button variant="outline" size="sm" onClick={onLimpiarFiltros}>
              Limpiar filtros
            </Button>
          </li>
        )}

        {estado === 'listo' &&
          viajes.length > 0 &&
          viajes.map((viaje) => (
            <li key={viaje.id}>
              <ViajeCard viaje={viaje} onAbrir={onAbrirViaje} />
            </li>
          ))}

        {estado === 'error' && (
          <li className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertTriangle className="text-danger size-8" aria-hidden="true" />
            <p className="text-text-muted text-sm">No se pudo cargar la lista de viajes.</p>
            <Button variant="outline" size="sm" onClick={onReintentar}>
              Reintentar
            </Button>
          </li>
        )}
      </ul>

      <div className="border-border shrink-0 border-t pt-3">
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          showInfo={false}
        />
      </div>
    </section>
  );
}
