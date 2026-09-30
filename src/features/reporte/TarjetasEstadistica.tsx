import { Camera, ShieldCheck, TriangleAlert, Truck } from 'lucide-react';

import type { EstadisticasReporte } from '@/lib/datos/metricas';

import { TarjetaEstadistica } from './TarjetaEstadistica';

/**
 * La fila de cuatro estadísticas de la cabecera del reporte: viajes auditados,
 * incidencias, evidencias fotográficas y efectividad de custodia.
 */
export function TarjetasEstadistica({ estadisticas }: { estadisticas: EstadisticasReporte }) {
  return (
    <section
      aria-label="Estadísticas generales del periodo"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
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
      <TarjetaEstadistica
        titulo="Efectividad de custodia"
        estadistica={estadisticas.efectividadCustodia}
        Icono={ShieldCheck}
      />
    </section>
  );
}
