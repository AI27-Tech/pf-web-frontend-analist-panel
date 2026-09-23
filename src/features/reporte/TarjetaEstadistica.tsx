import type { ComponentType } from 'react';

import { TarjetaResumen } from '@/components/TarjetaResumen';
import type { Estadistica } from '@/lib/datos/metricas';

/**
 * Tarjeta de la fila de estadísticas de la cabecera del reporte. Presentacional: recibe
 * la `Estadistica` ya calculada por `lib/datos/metricas` y la adapta a `TarjetaResumen`,
 * el diseño compartido del panel.
 */
export interface TarjetaEstadisticaProps {
  /** Rótulo corto en versalitas (`Viajes auditados`). */
  titulo: string;
  estadistica: Estadistica;
  /** Icono de lucide que acompaña al rótulo. */
  Icono: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** Cuando `true`, un delta positivo se pinta en rojo en vez de verde: sirve para
   *  métricas donde subir es malo (p. ej. incidencias). Por defecto, subir es bueno. */
  invertirColorDelta?: boolean;
}

export function TarjetaEstadistica({
  titulo,
  estadistica,
  Icono,
  invertirColorDelta = false,
}: TarjetaEstadisticaProps) {
  const { valor, delta, contexto } = estadistica;
  return (
    <TarjetaResumen
      titulo={titulo}
      Icono={Icono}
      valor={valor}
      delta={delta}
      contexto={contexto}
      invertirColorDelta={invertirColorDelta}
    />
  );
}
