import { Badge, Button } from '@ai27-tech/ui';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, FileText } from 'lucide-react';

import type { Viaje } from '@/lib/datos/tipos';

import { presentacionDeEstado } from '@/features/viajes/mapeoEstados';

/**
 * Cabecera del expediente: breadcrumb hacia la lista, placas con sus estados
 * operativos, y la acción de exportar a PDF.
 *
 * «Exportar reporte PDF» dispara la impresión del navegador (Ctrl+P): el PDF del
 * expediente ES la vista impresa, sin librería de por medio (docs/PLAN.md §8). La hoja
 * `@media print` de `styles/` da el formato de impresión.
 */
export interface ExpedienteHeaderProps {
  viaje: Viaje;
}

export function ExpedienteHeader({ viaje }: ExpedienteHeaderProps) {
  return (
    <header className="border-border flex flex-col gap-4 border-b px-8 py-6">
      <nav
        aria-label="Ruta de navegación"
        className="text-text-muted flex items-center gap-1.5 text-sm"
      >
        <Link to="/viajes" className="hover:text-text inline-flex items-center gap-1">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Viajes
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-text font-mono">Expediente {viaje.id}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-text font-mono text-xl font-bold">{viaje.placas}</span>
          {viaje.estados.map((estado) => {
            const presentacion = presentacionDeEstado(estado);
            return (
              <Badge
                key={estado}
                variant={presentacion.variant}
                dot={presentacion.dot}
                pulse={presentacion.pulse}
              >
                {presentacion.etiqueta}
              </Badge>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          startIcon={<FileText size={16} strokeWidth={1.75} />}
        >
          Exportar reporte PDF
        </Button>
      </div>
    </header>
  );
}
