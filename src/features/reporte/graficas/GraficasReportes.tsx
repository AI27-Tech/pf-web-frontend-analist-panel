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

import type { PuntoArchivosDia, PuntoViajesDia } from '../seriesReporte';

/**
 * Gráficas del modal «Reportes». Presentacionales: reciben la serie ya calculada
 * (`seriesReporte.ts`) con un punto por día del periodo. Reutilizan `PanelGrafica` y el
 * tema de las demás gráficas.
 */

/** Alto del área de la gráfica dentro del modal, más bajo que en las pantallas. */
const ALTO = 180;

const ejeComun = {
  stroke: 'var(--color-text-muted)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function etiquetaCorta(dia: string): string {
  return dia.slice(5);
}

function GraficaVacia({ mensaje }: { mensaje: string }) {
  return (
    <div className="text-text-muted flex h-full items-center justify-center text-center text-xs">
      {mensaje}
    </div>
  );
}

/**
 * Fotos y audios que subió la unidad cada día del periodo, en barras apiladas. Muestra lo
 * mismo que las filas del reporte de unidad.
 */
export function GraficaArchivosPorDia({ datos }: { datos: PuntoArchivosDia[] }) {
  const hayArchivos = datos.some((p) => p.fotos + p.audios > 0);

  return (
    <PanelGrafica
      titulo="Archivos por día"
      subtitulo="Fotos y audios que subió la unidad en el periodo."
      alto={ALTO}
    >
      {!hayArchivos ? (
        <GraficaVacia mensaje="La unidad no subió archivos en el periodo." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ left: -16, right: 8 }}>
            <CartesianGrid vertical={false} stroke={COLORES.borde} />
            <XAxis dataKey="dia" tickFormatter={etiquetaCorta} minTickGap={16} {...ejeComun} />
            <YAxis allowDecimals={false} {...ejeComun} />
            <Tooltip
              contentStyle={ESTILO_TOOLTIP}
              cursor={{ fill: 'var(--color-surface-high)' }}
              labelFormatter={(dia) => String(dia)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="fotos" name="Fotos" stackId="archivos" fill={COLORES.accent} />
            <Bar
              dataKey="audios"
              name="Audios"
              stackId="archivos"
              fill={COLORES.warning}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </PanelGrafica>
  );
}

/**
 * Viajes de cada día del periodo, en barras. Muestra lo mismo que la columna de viajes de
 * la actividad por día.
 */
export function GraficaViajesPorDia({ datos }: { datos: PuntoViajesDia[] }) {
  const hayViajes = datos.some((p) => p.viajes > 0);

  return (
    <PanelGrafica
      titulo="Seguimientos por día"
      subtitulo="Seguimientos de cada día del periodo."
      alto={ALTO}
    >
      {!hayViajes ? (
        <GraficaVacia mensaje="No hay seguimientos en el periodo." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ left: -16, right: 8 }}>
            <CartesianGrid vertical={false} stroke={COLORES.borde} />
            <XAxis dataKey="dia" tickFormatter={etiquetaCorta} minTickGap={16} {...ejeComun} />
            <YAxis allowDecimals={false} {...ejeComun} />
            <Tooltip
              contentStyle={ESTILO_TOOLTIP}
              cursor={{ fill: 'var(--color-surface-high)' }}
              labelFormatter={(dia) => String(dia)}
            />
            <Bar dataKey="viajes" name="Seguimientos" fill={COLORES.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </PanelGrafica>
  );
}
