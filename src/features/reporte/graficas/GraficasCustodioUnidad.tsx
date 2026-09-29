import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { PanelGrafica } from '@/features/sistema/graficas/PanelGrafica';
import { COLORES, ESTILO_TOOLTIP } from '@/features/sistema/graficas/tema';
import type { EstadisticaCustodio, EstadisticaUnidad } from '@/lib/datos/tipos';

/**
 * Gráficas del reporte del analista sobre el eje custodio/unidad. Presentacionales:
 * reciben los agregados ya calculados por `lib/datos/metricas` y sólo recortan el top 10
 * para no crecer sin límite. Reutilizan `PanelGrafica` y el tema del apartado Sistema.
 */

const TOP = 10;

const ejeComun = {
  stroke: 'var(--color-text-muted)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

/** Mensaje centrado para una gráfica sin datos. */
function GraficaVacia({ mensaje }: { mensaje: string }) {
  return (
    <div className="text-text-muted flex h-full items-center justify-center text-center text-xs">
      {mensaje}
    </div>
  );
}

/** Total de medios (fotos + audios) de un custodio. */
function totalMedios(c: EstadisticaCustodio): number {
  return c.fotos + c.audios;
}

/**
 * Fotos vs. audios por custodio, en barras apiladas horizontales. Top 10 por total de
 * medios (fotos + audios).
 */
export function GraficaFotosAudiosCustodio({ datos }: { datos: EstadisticaCustodio[] }) {
  const top = [...datos].sort((a, b) => totalMedios(b) - totalMedios(a)).slice(0, TOP);

  return (
    <PanelGrafica
      titulo="Evidencia por custodio"
      subtitulo="Fotos y audios capturados, top 10 por volumen"
    >
      {top.length === 0 ? (
        <GraficaVacia mensaje="No hay custodios con actividad en el periodo." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={COLORES.borde} />
            <XAxis type="number" allowDecimals={false} {...ejeComun} />
            <YAxis
              type="category"
              dataKey="nombre"
              width={140}
              {...ejeComun}
              tick={{ fontSize: 11, fill: 'var(--color-text)' }}
            />
            <Tooltip contentStyle={ESTILO_TOOLTIP} cursor={{ fill: 'var(--color-surface-high)' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="fotos"
              name="Fotos"
              stackId="medios"
              fill={COLORES.accent}
              maxBarSize={22}
            />
            <Bar
              dataKey="audios"
              name="Audios"
              stackId="medios"
              fill={COLORES.warning}
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </PanelGrafica>
  );
}

/** Viajes por unidad (placa), en barras horizontales. Top 10 por número de viajes. */
export function GraficaViajesPorUnidad({ datos }: { datos: EstadisticaUnidad[] }) {
  const top = datos.slice(0, TOP);

  return (
    <PanelGrafica titulo="Viajes por unidad" subtitulo="Placas con más viajes, top 10">
      {top.length === 0 ? (
        <GraficaVacia mensaje="No hay unidades con viajes en el periodo." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={COLORES.borde} />
            <XAxis type="number" allowDecimals={false} {...ejeComun} />
            <YAxis
              type="category"
              dataKey="placas"
              width={110}
              {...ejeComun}
              tick={{ fontSize: 11, fill: 'var(--color-text)' }}
            />
            <Tooltip contentStyle={ESTILO_TOOLTIP} cursor={{ fill: 'var(--color-surface-high)' }} />
            <Bar
              dataKey="viajes"
              name="Viajes"
              fill={COLORES.accent}
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </PanelGrafica>
  );
}
