import { Button } from '@ai27-tech/ui';
import { AlertTriangle, FileBarChart } from 'lucide-react';

/**
 * Estados de la vista de reporte: carga, vacío y error. Se extraen aquí para que
 * `ReporteSection` sólo decida cuál mostrar, y para que los tres compartan el mismo
 * encuadre. Mismo criterio que los estados de `ViajesList`.
 */

/** Bloque de una tarjeta de estadística en carga. */
function TarjetaEsqueleto() {
  return (
    <div className="border-border bg-surface animate-pulse rounded-lg border p-4">
      <div className="bg-surface-high h-3 w-2/3 rounded" />
      <div className="bg-surface-high mt-4 h-9 w-1/2 rounded" />
      <div className="bg-surface-high mt-3 h-3 w-3/4 rounded" />
    </div>
  );
}

/** Bloque de una gráfica en carga. */
function GraficaEsqueleto() {
  return (
    <div className="border-border bg-surface animate-pulse rounded-lg border p-4">
      <div className="bg-surface-high h-3 w-1/3 rounded" />
      <div className="bg-surface-high mt-4 h-40 w-full rounded" />
    </div>
  );
}

/** Esqueleto de toda la vista. */
export function ReporteCargando() {
  return (
    <div className="space-y-8 px-8 py-6" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <TarjetaEsqueleto key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraficaEsqueleto />
        <GraficaEsqueleto />
      </div>
    </div>
  );
}

/** El periodo no tiene datos que reportar. */
export function ReporteVacio({ onAmpliarRango }: { onAmpliarRango: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-24 text-center">
      <FileBarChart className="text-text-muted size-8" aria-hidden="true" />
      <p className="text-text-muted max-w-prose text-sm">
        No hay viajes en este periodo, así que no hay métricas que consolidar. Amplía el rango de
        fechas para ver el reporte.
      </p>
      <Button variant="outline" size="sm" onClick={onAmpliarRango}>
        Ampliar a este mes
      </Button>
    </div>
  );
}

/** No se pudieron cargar las métricas. */
export function ReporteError({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-24 text-center">
      <AlertTriangle className="text-danger size-8" aria-hidden="true" />
      <p className="text-text-muted text-sm">No se pudo cargar el reporte.</p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}
