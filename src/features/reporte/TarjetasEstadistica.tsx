import { Camera, TriangleAlert, Truck } from 'lucide-react';

import type { EstadisticasReporte } from '@/lib/datos/metricas';

import { TarjetaEstadistica } from './TarjetaEstadistica';

/**
 * La fila de estadísticas de la cabecera del reporte: viajes auditados, incidencias y
 * evidencias fotográficas.
 */
export function TarjetasEstadistica({ estadisticas }: { estadisticas: EstadisticasReporte }) {
  return (
    <section
      aria-label="Estadísticas generales del periodo"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <TarjetaEstadistica
        titulo="Viajes auditados"
        estadistica={estadisticas.viajesAuditados}
        Icono={Truck}
      />
      <TarjetaEstadistica
        titulo="Incidencias registradas"
        estadistica={estadisticas.incidenciasRegistradas}
        Icono={TriangleAlert}
        invertirColorDelta
      />
      <TarjetaEstadistica
        titulo="Evidencias fotográficas"
        estadistica={estadisticas.evidenciasFotograficas}
        Icono={Camera}
      />
    </section>
  );
}
