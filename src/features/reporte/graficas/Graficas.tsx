import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { GraficasReporte } from '@/lib/datos/metricas';

import { PanelGrafica } from './PanelGrafica';
import { COLORES, ESTILO_TOOLTIP } from './tema';

/**
 * Las gráficas del reporte, cada una presentacional sobre los datos que ya calculó
 * `lib/datos/metricas`.
 *
 * Cada gráfica maneja su estado vacío y de error.
 */

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

/** Descartes agrupados por motivo, en barras horizontales. */
export function GraficaDescartes({ datos }: { datos: GraficasReporte['descartesPorMotivo'] }) {
  return (
    <PanelGrafica
      titulo="Descartes por motivo"
      subtitulo="Viajes descartados y la razón registrada"
    >
      {datos.length === 0 ? (
        <GraficaVacia mensaje="No hubo viajes descartados en el periodo." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={COLORES.borde} />
            <XAxis type="number" allowDecimals={false} {...ejeComun} />
            <YAxis
              type="category"
              dataKey="categoria"
              width={140}
              {...ejeComun}
              tick={{ fontSize: 11, fill: 'var(--color-text)' }}
            />
            <Tooltip contentStyle={ESTILO_TOOLTIP} cursor={{ fill: 'var(--color-surface-high)' }} />
            <Bar dataKey="valor" fill={COLORES.danger} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </PanelGrafica>
  );
}

/** Distribución horaria de capturas, en línea sobre las 24 horas del día. */
export function GraficaCapturasPorHora({
  datos,
}: {
  datos: GraficasReporte['capturasPorHora'];
}) {
  const total = datos.reduce((suma, punto) => suma + punto.valor, 0);

  return (
    <PanelGrafica
      titulo="Capturas por hora"
      subtitulo="A qué horas del día se registra la evidencia"
    >
      {total === 0 ? (
        <GraficaVacia mensaje="No hay capturas en el periodo." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ left: -16, right: 8 }}>
            <CartesianGrid vertical={false} stroke={COLORES.borde} />
            <XAxis dataKey="etiqueta" interval={3} {...ejeComun} />
            <YAxis allowDecimals={false} {...ejeComun} />
            <Tooltip contentStyle={ESTILO_TOOLTIP} />
            <Line
              type="monotone"
              dataKey="valor"
              stroke={COLORES.accent}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </PanelGrafica>
  );
}

/** GB acumulados de evidencia a lo largo del periodo, en área. */
export function GraficaGbAcumulados({ datos }: { datos: GraficasReporte['gbAcumulados'] }) {
  const totalGb = datos[datos.length - 1]?.valor ?? 0;

  return (
    <PanelGrafica
      titulo="Almacenamiento acumulado"
      subtitulo="Crecimiento de la evidencia en el periodo"
      extra={
        <span className="text-accent cifras-tabulares text-sm font-semibold">
          {totalGb.toFixed(2)} GB
        </span>
      }
    >
      {datos.length === 0 ? (
        <GraficaVacia mensaje="No hay evidencia acumulada en el periodo." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={datos} margin={{ left: -16, right: 8 }}>
            <defs>
              <linearGradient id="gradiente-gb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={COLORES.borde} />
            <XAxis dataKey="etiqueta" {...ejeComun} />
            <YAxis allowDecimals {...ejeComun} width={40} unit=" GB" />
            <Tooltip contentStyle={ESTILO_TOOLTIP} formatter={(valor) => [`${valor} GB`, 'Acumulado']} />
            <Area
              type="monotone"
              dataKey="valor"
              stroke={COLORES.accent}
              strokeWidth={2}
              fill="url(#gradiente-gb)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </PanelGrafica>
  );
}
