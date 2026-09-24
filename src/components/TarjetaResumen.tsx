import { Card } from '@ai27-tech/ui';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

/**
 * Tarjeta de resumen del panel: rótulo en versalitas arriba, ícono en la esquina
 * superior derecha, y el valor con su contexto alineados al pie. Es el diseño que nació
 * en la cabecera del reporte y ahora comparten el reporte y el expediente, para que las
 * dos pantallas se vean iguales. Usa la `Card` de la librería para heredar superficie,
 * borde y radio de Nocturne.
 */
export interface TarjetaResumenProps {
  /** Rótulo corto en versalitas (`Viajes auditados`, `Fecha de registro`). */
  titulo: string;
  /** Icono de lucide que acompaña al rótulo, en la esquina superior derecha. */
  Icono: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** Valor principal. Un número/porcentaje va grande; un texto (fecha, nombre) va mediano. */
  valor: ReactNode;
  /**
   * Tamaño del valor. `grande` (por defecto) es la cifra prominente del reporte;
   * `medio` sirve para valores de texto —fechas, nombres— que no caben a 5xl.
   */
  tamanoValor?: 'grande' | 'medio';
  /** Texto corto bajo el valor (`vs. periodo anterior`, `de 11 esperados`). */
  contexto?: ReactNode;
  /** Variación respecto a un periodo anterior, como fracción (0.124 = +12.4%). Omitir
   *  o `null` cuando no hay comparación: entonces sólo se muestra el `contexto`. */
  delta?: number | null;
  /** Cuando `true`, un delta positivo se pinta en rojo en vez de verde: para métricas
   *  donde subir es malo (p. ej. incidencias). Por defecto, subir es bueno. */
  invertirColorDelta?: boolean;
}

/** Formatea el delta como porcentaje con signo: 0.124 → `+12.4%`. */
function textoDelta(delta: number): string {
  const signo = delta >= 0 ? '+' : '';
  return `${signo}${(delta * 100).toFixed(1)}%`;
}

export function TarjetaResumen({
  titulo,
  Icono,
  valor,
  tamanoValor = 'grande',
  contexto,
  delta = null,
  invertirColorDelta = false,
}: TarjetaResumenProps) {
  const sube = delta !== null && delta >= 0;
  // "Bueno" es verde; si la métrica invierte el sentido, subir es malo.
  const esFavorable = invertirColorDelta ? !sube : sube;
  const FlechaDelta = sube ? TrendingUp : TrendingDown;

  const claseValor =
    tamanoValor === 'grande' ? 'text-5xl font-semibold tracking-tight' : 'text-lg font-semibold';

  return (
    <Card
      variant="outlined"
      padding="none"
      className="bloque-imprimible flex min-h-40 flex-col p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-text-muted flex items-center gap-1.5 font-mono text-[12px] tracking-widest uppercase">
          {titulo}
        </h3>
        <Icono className="text-text-muted size-4 shrink-0" aria-hidden={true} />
      </div>

      <div className="mt-auto">
        <p className={`text-text cifras-tabulares ${claseValor}`}>{valor}</p>

        {(delta !== null || contexto) && (
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
                {contexto && <span className="text-text-muted truncate">{contexto}</span>}
              </>
            )}
          </p>
        )}
      </div>
    </Card>
  );
}
