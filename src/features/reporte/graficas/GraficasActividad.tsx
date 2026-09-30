import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { PanelGrafica } from '@/features/sistema/graficas/PanelGrafica';
import { COLORES, ESTILO_TOOLTIP } from '@/features/sistema/graficas/tema';
import type { PuntoCategoria, PuntoSerie } from '@/lib/datos/metricas';

/**
 * Gráficas de «Actividad del periodo»: la tendencia diaria de viajes y la composición por
 * estado del conjunto (filtrado o global). Presentacionales sobre los datos ya derivados
 * en cliente por `agregadosReporte`. Reutilizan `PanelGrafica` y el tema del apartado
 * Sistema.
 */

const ejeComun = {
  stroke: 'var(--color-text-muted)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

/** Paleta cíclica para las categorías de la dona. */
const PALETA = [COLORES.accent, COLORES.warning, COLORES.success, COLORES.danger, COLORES.muted];

function GraficaVacia({ mensaje }: { mensaje: string }) {
  return (
    <div className="text-text-muted flex h-full items-center justify-center text-center text-xs">
      {mensaje}
    </div>
  );
}

/** Viajes por día, en línea sobre los días del periodo. */
export function GraficaViajesPorDia({ datos }: { datos: PuntoSerie[] }) {
  const total = datos.reduce((s, p) => s + p.valor, 0);
  return (
    <PanelGrafica titulo="Viajes por día" subtitulo="Actividad diaria del periodo">
      {total === 0 ? (
        <GraficaVacia mensaje="No hay viajes en el periodo." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ left: -16, right: 8 }}>
            <CartesianGrid vertical={false} stroke={COLORES.borde} />
            <XAxis dataKey="etiqueta" {...ejeComun} />
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

/** Distribución de viajes por estado (ciclo), en dona. */
export function GraficaDistribucionCiclo({ datos }: { datos: PuntoCategoria[] }) {
  const total = datos.reduce((s, p) => s + p.valor, 0);
  return (
    <PanelGrafica titulo="Distribución por estado" subtitulo="Viajes por ciclo en el periodo">
      {total === 0 ? (
        <GraficaVacia mensaje="No hay viajes en el periodo." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              dataKey="valor"
              nameKey="categoria"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
            >
              {datos.map((p, i) => (
                <Cell key={p.categoria} fill={PALETA[i % PALETA.length] ?? COLORES.accent} />
              ))}
            </Pie>
            <Tooltip contentStyle={ESTILO_TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </PanelGrafica>
  );
}
