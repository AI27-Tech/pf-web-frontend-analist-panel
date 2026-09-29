import { Badge, Button } from '@ai27-tech/ui';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FileBarChart } from 'lucide-react';
import { useState } from 'react';

import { SelectorPeriodo } from '@/features/reporte/SelectorPeriodo';
import { obtenerMetricas } from '@/lib/datos/metricas';
import { resolverPeriodo, type SeleccionPeriodo } from '@/lib/formato/fechas';

import { GraficasSection } from './GraficasSection';

/**
 * Apartado «Sistema»: las gráficas de operación y evidencia (descartes por motivo,
 * capturas por hora y almacenamiento acumulado). Es información técnica/operativa del
 * periodo, separada a propósito del reporte del analista, que ahora se centra en el
 * desglose por custodio y por viaje.
 *
 * Sigue el mismo patrón que `ReporteSection`: el periodo vive en estado y `useQuery` lo
 * toma como clave; las gráficas salen del mismo paquete `Metricas`.
 */
export function SistemaSection() {
  const [periodo, setPeriodo] = useState<SeleccionPeriodo>({ atajo: 'mes' });

  const rango = resolverPeriodo(periodo);

  const consulta = useQuery({
    queryKey: ['metricas', rango],
    queryFn: () => obtenerMetricas(rango),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-border border-b px-8 py-6">
        <div className="flex items-center gap-3">
          <h1 className="text-text text-2xl font-semibold tracking-tight">Sistema</h1>
          <Badge variant="neutral" pill>
            OPERACIÓN Y EVIDENCIA
          </Badge>
        </div>
        <p className="text-text-muted mt-2 text-sm">
          Cobertura, descartes y volumen de evidencia del periodo
        </p>
        <div className="no-imprimir mt-4">
          <SelectorPeriodo seleccion={periodo} onChange={setPeriodo} />
        </div>
      </header>

      {consulta.isPending && (
        <div className="space-y-4 px-8 py-6" aria-busy="true" aria-live="polite">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="border-border bg-surface h-64 animate-pulse rounded-lg border" />
            <div className="border-border bg-surface h-64 animate-pulse rounded-lg border" />
          </div>
          <div className="border-border bg-surface h-64 animate-pulse rounded-lg border" />
        </div>
      )}

      {consulta.isError && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-24 text-center">
          <AlertTriangle className="text-danger size-8" aria-hidden="true" />
          <p className="text-text-muted text-sm">No se pudieron cargar las gráficas.</p>
          <Button variant="outline" size="sm" onClick={() => consulta.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {consulta.isSuccess && (
        <div className="space-y-8 px-8 py-6">
          <GraficasSection graficas={consulta.data.graficas} />
          {consulta.data.estadisticas.viajesAuditados.valor === '0' && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <FileBarChart className="text-text-muted size-6" aria-hidden="true" />
              <p className="text-text-muted text-sm">
                No hay actividad en este periodo, así que las gráficas están vacías.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
