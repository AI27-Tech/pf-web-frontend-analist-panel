import { Badge, Button } from '@ai27-tech/ui';
import { Printer } from 'lucide-react';

import type { SeleccionPeriodo } from '@/lib/formato/fechas';

import { SelectorPeriodo } from './SelectorPeriodo';

/**
 * Cabecera del reporte: título con su sello, folio derivado del periodo, subtítulo,
 * atajos de periodo y botón Imprimir.
 */
export interface ReporteHeaderProps {
  folio: string;
  seleccion: SeleccionPeriodo;
  onPeriodoChange: (seleccion: SeleccionPeriodo) => void;
  /** Dispara la impresión. */
  onImprimir?: () => void;
}

export function ReporteHeader({
  folio,
  seleccion,
  onPeriodoChange,
  onImprimir,
}: ReporteHeaderProps) {
  function imprimir(): void {
    (onImprimir ?? (() => window.print()))();
  }

  return (
    <header className="border-border border-b px-8 py-6">
      {/* Fila superior: identidad del reporte. */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-text text-2xl font-semibold tracking-tight">Reporte</h1>
          <Badge variant="escort" pill>
            AI27 FORENSIC AUDIT
          </Badge>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="border-border text-text-muted rounded border px-2 py-0.5 font-mono text-xs">
            {folio}
          </span>
          <p className="text-text-muted text-sm">
            Consolidado de incidentes, telemetría y evidencias
          </p>
        </div>
      </div>

      {/* Fila inferior: controles de periodo e impresión. No se imprimen. */}
      <div className="no-imprimir mt-4 flex flex-wrap items-center gap-4">
        <SelectorPeriodo seleccion={seleccion} onChange={onPeriodoChange} />

        <Button
          variant="outline"
          onClick={imprimir}
          startIcon={<Printer size={16} strokeWidth={1.75} />}
        >
          Imprimir
        </Button>
      </div>
    </header>
  );
}
