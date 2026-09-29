import type { EstadisticaCustodio, EstadisticaUnidad } from '@/lib/datos/tipos';

import {
  GraficaFotosAudiosCustodio,
  GraficaViajesPorUnidad,
} from './graficas/GraficasCustodioUnidad';

/**
 * Banda de gráficas del reporte del analista: resumen visual del eje custodio/unidad,
 * encima de las tablas. Cada gráfica es independiente (no cruza custodio con unidad).
 */
export interface GraficasReporteSectionProps {
  porCustodio: EstadisticaCustodio[];
  porUnidad: EstadisticaUnidad[];
}

export function GraficasReporteSection({ porCustodio, porUnidad }: GraficasReporteSectionProps) {
  return (
    <section aria-labelledby="graficas-reporte-titulo" className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="bg-surface-high text-text-muted rounded px-2 py-0.5 font-mono text-xs">
          01
        </span>
        <div>
          <h2 id="graficas-reporte-titulo" className="text-text text-sm font-semibold">
            Custodios y unidades
          </h2>
          <p className="text-text-muted text-xs">
            Evidencia capturada por custodio y viajes por unidad en el periodo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraficaFotosAudiosCustodio datos={porCustodio} />
        <GraficaViajesPorUnidad datos={porUnidad} />
      </div>
    </section>
  );
}
