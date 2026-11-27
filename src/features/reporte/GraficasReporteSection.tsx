import type { EstadisticaCustodio, EstadisticaUnidad, FilaViaje } from '@/lib/datos/tipos';

import type { FiltroReporte } from './filtros';
import { GraficaEnvios } from './graficas/GraficasEnvio';
import {
  GraficaFotosAudiosCustodio,
  GraficaViajesPorUnidad,
} from './graficas/GraficasCustodioUnidad';

/**
 * Banda de gráficas del eje custodio/unidad. Ambas son INTERACTIVAS: un clic en una barra
 * fija el custodio o la unidad en el filtro global, y todo lo demás se recalcula. Reciben
 * datos ya filtrados. La gráfica de envíos abre la vista por Shipment ID del envío elegido.
 */
export interface GraficasReporteSectionProps {
  porCustodio: EstadisticaCustodio[];
  porUnidad: EstadisticaUnidad[];
  porViaje: FilaViaje[];
  filtro: FiltroReporte;
  onFiltroChange: (filtro: FiltroReporte) => void;
  /** Shipment ID del envío abierto en la URL, o `null`. */
  envioSeleccionado: string | null;
  /** Clic en una barra de envíos: abre el envío; `null` (o «Sin envío») limpia. */
  onSeleccionarEnvio: (shipmentId: string | null) => void;
}

export function GraficasReporteSection({
  porCustodio,
  porUnidad,
  porViaje,
  filtro,
  onFiltroChange,
  envioSeleccionado,
  onSeleccionarEnvio,
}: GraficasReporteSectionProps) {
  function alternarCustodio(uid: string): void {
    onFiltroChange({ ...filtro, custodio: filtro.custodio === uid ? null : uid });
  }

  function alternarUnidad(placas: string): void {
    onFiltroChange({ ...filtro, unidad: filtro.unidad === placas ? null : placas });
  }

  return (
    <section aria-labelledby="graficas-reporte-titulo" className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="bg-surface-high text-text-muted rounded px-2 py-0.5 font-mono text-xs">
          01
        </span>
        <div>
          <h2 id="graficas-reporte-titulo" className="text-text text-sm font-semibold">
            Unidades y números económicos
          </h2>
          <p className="text-text-muted text-xs">
            Evidencia por unidad y seguimientos por número económico. Haz clic en una barra para
            filtrar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraficaFotosAudiosCustodio
          datos={porCustodio}
          seleccion={filtro.custodio}
          onSeleccionar={alternarCustodio}
        />
        <GraficaViajesPorUnidad
          datos={porUnidad}
          seleccion={filtro.unidad}
          onSeleccionar={alternarUnidad}
        />
        <GraficaEnvios
          porViaje={porViaje}
          seleccion={envioSeleccionado}
          onSeleccionar={onSeleccionarEnvio}
        />
      </div>
    </section>
  );
}
