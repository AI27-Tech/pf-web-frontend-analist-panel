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
import type { FilaViaje } from '@/lib/datos/tipos';

import { SIN_ENVIO, estadisticasDeEnvios } from '../agregadosEnvios';

/**
 * Gráfica «Envíos del periodo»: seguimientos y validaciones por Shipment ID, en barras
 * apiladas horizontales, top 10. Igual que las gráficas de custodio y unidad, un clic en
 * una barra abre ese envío en la vista por Shipment ID. La barra «Sin envío» no navega:
 * no hay vista para ella.
 */

const TOP = 10;

/** Opacidad de una barra según la selección: llena si es la elegida o si no hay ninguna. */
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

export interface GraficaEnviosProps {
  porViaje: FilaViaje[];
  /** Shipment ID del envío abierto en la URL, o `null`. */
  seleccion: string | null;
  /** Clic en una barra: abre el envío; clic de nuevo lo cierra; «Sin envío» limpia. */
  onSeleccionar: (shipmentId: string | null) => void;
}

/**
 * Seguimientos vs. validaciones por envío, en barras apiladas horizontales. Top 10 por
 * validaciones. Un clic abre el envío por Shipment ID; otro clic en la misma barra lo
 * cierra; «Sin envío» agrupa los reportes sin vínculo y su clic limpia la selección.
 */
export function GraficaEnvios({ porViaje, seleccion, onSeleccionar }: GraficaEnviosProps) {
  const top = estadisticasDeEnvios(porViaje).slice(0, TOP);
  const haySeleccion = seleccion !== null;

  function alternar(shipmentId: string): void {
    onSeleccionar(shipmentId === SIN_ENVIO ? null : shipmentId);
  }

  return (
    <PanelGrafica
      titulo="Envíos del periodo"
      subtitulo="Seguimientos y validaciones por Shipment ID, top 10. Haz clic para abrir el envío; «Sin envío» agrupa los reportes sin vínculo."
    >
      {top.length === 0 ? (
        <GraficaVacia mensaje="No hay envíos con seguimientos en el periodo." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={COLORES.borde} />
            <XAxis type="number" allowDecimals={false} {...ejeComun} />
            <YAxis
              type="category"
              dataKey="shipmentId"
              width={110}
              {...ejeComun}
              tick={{ fontSize: 11, fill: 'var(--color-text)' }}
            />
            <Tooltip contentStyle={ESTILO_TOOLTIP} cursor={{ fill: 'var(--color-surface-high)' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="seguimientos"
              name="Seguimientos"
              stackId="envio"
              fill={COLORES.accent}
              maxBarSize={22}
              onClick={(_, i) => alternar(top[i]!.shipmentId)}
              className="cursor-pointer"
            >
              {top.map((e) => (
                <Cell
                  key={e.shipmentId}
                  fillOpacity={opacidadBarra(e.shipmentId === seleccion, haySeleccion)}
                />
              ))}
            </Bar>
            <Bar
              dataKey="validaciones"
              name="Validaciones"
              stackId="envio"
              fill={COLORES.warning}
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
              onClick={(_, i) => alternar(top[i]!.shipmentId)}
              className="cursor-pointer"
            >
              {top.map((e) => (
                <Cell
                  key={e.shipmentId}
                  fillOpacity={opacidadBarra(e.shipmentId === seleccion, haySeleccion)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </PanelGrafica>
  );
}
