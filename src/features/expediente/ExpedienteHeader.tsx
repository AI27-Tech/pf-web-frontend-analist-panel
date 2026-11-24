import { Badge, Breadcrumb, Button } from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';
import { FileText } from 'lucide-react';

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
  const navigate = useNavigate();

  return (
    <header className="border-border flex flex-col gap-4 border-b px-4 py-4 sm:px-8 sm:py-6">
      <Breadcrumb
        aria-label="Ruta de navegación"
        items={[
          {
            label: 'Seguimientos',
            href: '/viajes',
            // Renderiza como `<a>` real, pero navega con el router sin recargar la SPA.
            onClick: (evento) => {
              evento.preventDefault();
              void navigate({ to: '/viajes' });
            },
          },
          { label: `Expediente ${viaje.id}` },
        ]}
      />

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
