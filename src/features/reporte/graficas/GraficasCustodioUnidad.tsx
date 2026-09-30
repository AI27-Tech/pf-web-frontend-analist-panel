import {
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
      titulo="Evidencia por custodio"
      subtitulo="Fotos y audios capturados, top 10. Haz clic para filtrar."
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
 * Viajes por unidad (placa), en barras horizontales. Top 10 por número de viajes. Clic
 * en una barra alterna la selección de la placa.
 */
export function GraficaViajesPorUnidad({ datos, seleccion, onSeleccionar }: GraficaUnidadProps) {
  const top = datos.slice(0, TOP);
  const haySeleccion = seleccion !== null;

  return (
    <PanelGrafica
      titulo="Viajes por unidad"
      subtitulo="Placas con más viajes, top 10. Haz clic para filtrar."
    >
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
              onClick={(_, i) => onSeleccionar(top[i]!.placas)}
              className="cursor-pointer"
            >
              {top.map((u) => (
                <Cell
                  key={u.placas}
                  fillOpacity={opacidadBarra(u.placas === seleccion, haySeleccion)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </PanelGrafica>
  );
}
