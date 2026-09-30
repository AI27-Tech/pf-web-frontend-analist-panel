import type { FilaViaje } from '@/lib/datos/tipos';

import { distribucionPorCiclo, viajesPorDia } from './agregadosReporte';
import { GraficaDistribucionCiclo, GraficaViajesPorDia } from './graficas/GraficasActividad';

/**
 * Banda «Actividad del periodo»: la tendencia diaria de viajes y la composición por
 * estado del conjunto (filtrado o global). Responde al filtro global: recibe los viajes
 * ya filtrados y las gráficas se recalculan.
 */
export interface ActividadReporteSectionProps {
  porViaje: FilaViaje[];
}

export function ActividadReporteSection({ porViaje }: ActividadReporteSectionProps) {
  return (
    <section aria-labelledby="actividad-titulo" className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="bg-surface-high text-text-muted rounded px-2 py-0.5 font-mono text-xs">
          03
        </span>
        <div>
          <h2 id="actividad-titulo" className="text-text text-sm font-semibold">
            Actividad del periodo
          </h2>
          <p className="text-text-muted text-xs">
            Tendencia diaria de viajes y composición por estado
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraficaViajesPorDia datos={viajesPorDia(porViaje)} />
        <GraficaDistribucionCiclo datos={distribucionPorCiclo(porViaje)} />
      </div>
    </section>
  );
}
