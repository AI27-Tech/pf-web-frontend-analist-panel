import { Camera, Truck } from 'lucide-react';

import type { EstadisticasReporte } from '@/lib/datos/metricas';

import { TarjetaEstadistica } from './TarjetaEstadistica';

/**
 * La fila de estadísticas de la cabecera del reporte: viajes auditados y evidencias
 * fotográficas.
 *
 * `EstadisticasReporte` sigue calculando las incidencias registradas, pero la tarjeta no
 * se muestra por decisión de producto; basta con volver a agregarla aquí para recuperarla.
 */
export function TarjetasEstadistica({ estadisticas }: { estadisticas: EstadisticasReporte }) {
  return (
    <section
      aria-label="Estadísticas generales del periodo"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <TarjetaEstadistica
        titulo="Seguimientos auditados"
        estadistica={estadisticas.viajesAuditados}
        Icono={Truck}
      />
      <TarjetaEstadistica
        titulo="Evidencias fotográficas"
        estadistica={estadisticas.evidenciasFotograficas}
        Icono={Camera}
      />
    </section>
  );
}
