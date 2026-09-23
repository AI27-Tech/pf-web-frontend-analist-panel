import type { GraficasReporte } from '@/lib/datos/metricas';

import {
  GraficaCapturasPorHora,
  GraficaDescartes,
  GraficaGbAcumulados,
} from './graficas/Graficas';

/**
 * Banda de gráficas del reporte.
 */
export function GraficasSection({ graficas }: { graficas: GraficasReporte }) {
  return (
    <section aria-labelledby="graficas-titulo" className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="bg-surface-high text-text-muted rounded px-2 py-0.5 font-mono text-xs">
          01
        </span>
        <div>
          <h2 id="graficas-titulo" className="text-text text-sm font-semibold">
            Operación y evidencia
          </h2>
          <p className="text-text-muted text-xs">
            Cobertura, descartes, tiempos en ruta y volumen de evidencia del periodo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraficaDescartes datos={graficas.descartesPorMotivo} />
        <GraficaCapturasPorHora datos={graficas.capturasPorHora} />
      </div>

      <GraficaGbAcumulados datos={graficas.gbAcumulados} />
    </section>
  );
}
