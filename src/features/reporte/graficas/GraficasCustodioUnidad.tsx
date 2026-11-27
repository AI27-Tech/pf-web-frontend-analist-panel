import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
 *
 * Son INTERACTIVAS: un clic en una barra alterna la selección (custodio o unidad) del
 * filtro compartido, y la barra seleccionada se resalta atenuando las demás. Cuando no
 * hay selección, todas las barras se ven al 100 %.
 */

const TOP = 10;

/** Opacidad de una barra según la selección: llena si es la elegida o si no hay ninguna;
 *  atenuada en caso contrario. */
function opacidadBarra(esSeleccionada: boolean, haySeleccion: boolean): number {
  if (!haySeleccion) return 1;
  return esSeleccionada ? 1 : 0.3;
}

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

export interface GraficaCustodioProps {
  datos: EstadisticaCustodio[];
  /** `uid` del custodio seleccionado, o `null`. */
  seleccion: string | null;
  /** Alterna la selección de un custodio (clic en su barra). */
  onSeleccionar: (uid: string) => void;
}

/**
 * Fotos vs. audios por custodio, en barras apiladas horizontales. Top 10 por total de
 * medios (fotos + audios). Clic en una barra alterna la selección del custodio.
 */
export function GraficaFotosAudiosCustodio({
  datos,
  seleccion,
  onSeleccionar,
}: GraficaCustodioProps) {
  const top = [...datos].sort((a, b) => totalMedios(b) - totalMedios(a)).slice(0, TOP);
  const haySeleccion = seleccion !== null;

  return (
    <PanelGrafica
      titulo="Evidencia por unidad"
      subtitulo="Fotos y audios capturados, top 10. Haz clic para filtrar."
    >
      {top.length === 0 ? (
        <GraficaVacia mensaje="No hay unidades con actividad en el periodo." />
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
              onClick={(_, i) => onSeleccionar(top[i]!.uid)}
              className="cursor-pointer"
            >
              {top.map((c) => (
                <Cell key={c.uid} fillOpacity={opacidadBarra(c.uid === seleccion, haySeleccion)} />
              ))}
            </Bar>
            <Bar
              dataKey="audios"
              name="Audios"
              stackId="medios"
              fill={COLORES.warning}
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
              onClick={(_, i) => onSeleccionar(top[i]!.uid)}
              className="cursor-pointer"
            >
              {top.map((c) => (
                <Cell key={c.uid} fillOpacity={opacidadBarra(c.uid === seleccion, haySeleccion)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </PanelGrafica>
  );
}

export interface GraficaUnidadProps {
  datos: EstadisticaUnidad[];
  /** Placa seleccionada, o `null`. */
  seleccion: string | null;
  /** Alterna la selección de una placa (clic en su barra). */
  onSeleccionar: (placas: string) => void;
}

/**
 * Viajes por unidad (placa), en área. Top 10 por número de viajes. Clic en un punto
 * alterna la selección de la placa.
 */
export function GraficaViajesPorUnidad({ datos, seleccion, onSeleccionar }: GraficaUnidadProps) {
  const top = datos.slice(0, TOP);
  const haySeleccion = seleccion !== null;

  return (
    <PanelGrafica
      titulo="Seguimientos por número económico"
      subtitulo="Números económicos con más seguimientos, top 10. Haz clic para filtrar."
    >
      {top.length === 0 ? (
        <GraficaVacia mensaje="No hay números económicos con seguimientos en el periodo." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={top}
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
            onClick={(estado) => {
              const crudo = estado?.activeTooltipIndex;
              const indice = crudo === undefined || crudo === null ? NaN : Number(crudo);
              const dato = Number.isInteger(indice) && indice >= 0 ? top[indice] : undefined;
              if (dato) onSeleccionar(dato.placas);
            }}
          >
            <CartesianGrid stroke={COLORES.borde} />
            <XAxis
              dataKey="placas"
              {...ejeComun}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={56}
              tick={{ fontSize: 10, fill: 'var(--color-text)' }}
            />
            <YAxis allowDecimals={false} {...ejeComun} width={36} />
            <Tooltip
              contentStyle={ESTILO_TOOLTIP}
              cursor={{ stroke: COLORES.muted, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="viajes"
              name="Seguimientos"
              stroke={COLORES.accent}
              strokeWidth={2}
              fill={COLORES.accent}
              fillOpacity={haySeleccion ? 0.12 : 0.35}
              activeDot={{ r: 4 }}
              className="cursor-pointer"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </PanelGrafica>
  );
}
