import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { folioDePeriodo, obtenerMetricas } from '@/lib/datos/metricas';
import { resolverPeriodo, type SeleccionPeriodo } from '@/lib/formato/fechas';

import { GraficasSection } from './GraficasSection';
import { ReporteHeader } from './ReporteHeader';
import { TarjetasEstadistica } from './TarjetasEstadistica';
import { ReporteCargando, ReporteError, ReporteVacio } from './estados';

/**
 * Orquesta la pantalla de reporte.
 *
 * Sigue el mismo patrón que la pantalla de Viajes: el periodo vive en estado y `useQuery`
 * lo toma como clave, así cambiar de atajo reconsulta y cachea cada periodo por separado.
 * El fetch pasa por `lib/datos/`.
 */
export function ReporteSection() {
  const [periodo, setPeriodo] = useState<SeleccionPeriodo>({ atajo: 'mes' });

  const rango = resolverPeriodo(periodo);

  const consulta = useQuery({
    queryKey: ['metricas', rango],
    queryFn: () => obtenerMetricas(rango),
  });

  const folio = consulta.data?.folio ?? folioDePeriodo(rango);

  const sinDatos =
    consulta.isSuccess && consulta.data.estadisticas.viajesAuditados.valor === '0';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ReporteHeader folio={folio} seleccion={periodo} onPeriodoChange={setPeriodo} />

      {consulta.isPending && <ReporteCargando />}

      {consulta.isError && <ReporteError onReintentar={() => consulta.refetch()} />}

      {consulta.isSuccess && sinDatos && (
        <ReporteVacio onAmpliarRango={() => setPeriodo({ atajo: 'mes' })} />
      )}

      {consulta.isSuccess && !sinDatos && (
        <div className="reporte-imprimible space-y-8 px-8 py-6">
          <TarjetasEstadistica estadisticas={consulta.data.estadisticas} />
          <GraficasSection graficas={consulta.data.graficas} />
        </div>
      )}
    </div>
  );
}
