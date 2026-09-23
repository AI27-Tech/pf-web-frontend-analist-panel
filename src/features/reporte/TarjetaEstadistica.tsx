import { Card } from '@ai27-tech/ui';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ComponentType } from 'react';

import type { Estadistica } from '@/lib/datos/metricas';

/**
 * Una tarjeta de la fila de estadísticas de la cabecera. Presentacional: recibe la
 * `Estadistica` ya calculada por `lib/datos/metricas`. Usa la `Card` de la librería para
 * heredar superficie, borde y radio de Nocturne.
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

/** Formatea el delta como porcentaje con signo: 0.124 → `+12.4%`. */
function textoDelta(delta: number): string {
  const signo = delta >= 0 ? '+' : '';
  return `${signo}${(delta * 100).toFixed(1)}%`;
}

export function TarjetaEstadistica({
  titulo,
  estadistica,
  Icono,
  invertirColorDelta = false,
}: TarjetaEstadisticaProps) {
  const { valor, delta, contexto } = estadistica;
  const sube = delta !== null && delta >= 0;
  // "Bueno" es verde; si la métrica invierte el sentido, subir es malo.
  const esFavorable = invertirColorDelta ? !sube : sube;
  const FlechaDelta = sube ? TrendingUp : TrendingDown;

  return (
    <Card variant="outlined" padding="none" className="bloque-imprimible flex min-h-40 flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-text-muted flex items-center gap-1.5 font-mono text-[12px] tracking-widest uppercase">
          {titulo}
        </h3>
        <Icono className="text-text-muted size-4 shrink-0" aria-hidden={true} />
      </div>

      <div className="mt-auto">
        <p className="text-text cifras-tabulares text-5xl font-semibold tracking-tight">
          {valor}
        </p>

        <p className="mt-2 flex items-center gap-1.5 text-xs">
          {delta === null ? (
            <span className="text-text-muted">{contexto}</span>
          ) : (
            <>
              <span
                className={`flex items-center gap-1 font-semibold ${
                  esFavorable ? 'text-success' : 'text-danger'
                }`}
              >
                <FlechaDelta className="size-3.5" aria-hidden="true" />
                <span className="cifras-tabulares">{textoDelta(delta)}</span>
              </span>
              <span className="text-text-muted truncate">{contexto}</span>
            </>
          )}
        </p>
      </div>
    </Card>
  );
}
