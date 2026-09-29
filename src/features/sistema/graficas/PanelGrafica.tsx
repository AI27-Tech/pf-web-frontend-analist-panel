import { Card } from '@ai27-tech/ui';
import type { ReactNode } from 'react';

/**
 * Marco común de una gráfica del reporte: título, subtítulo y el cuerpo con altura fija.
 * Usa la `Card` de la librería para heredar la superficie de Nocturne..
 */
export interface PanelGraficaProps {
  titulo: string;
  subtitulo?: string;
  /** Contenido opcional a la derecha del título (un dato destacado, una leyenda). */
  extra?: ReactNode;
  /** Alto del área de la gráfica en px. */
  alto?: number;
  children: ReactNode;
}

export function PanelGrafica({
  titulo,
  subtitulo,
  extra,
  alto = 220,
  children,
}: PanelGraficaProps) {
  return (
    // La `Card` sólo pasa su `padding` a sus subcomponentes; el contenido propio de este
    // panel lleva el espaciado explícito con `p-4`.
    <Card variant="outlined" padding="none" className="bloque-imprimible flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-text text-sm font-semibold">{titulo}</h3>
          {subtitulo && <p className="text-text-muted mt-0.5 text-xs">{subtitulo}</p>}
        </div>
        {extra}
      </div>
      <div className="mt-4" style={{ height: alto }}>
        {children}
      </div>
    </Card>
  );
}
