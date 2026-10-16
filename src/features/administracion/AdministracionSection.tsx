import { Badge } from '@ai27-tech/ui';
import { Settings } from 'lucide-react';

import { FormularioCustodio } from './custodios/FormularioCustodio';
import { ListaSolicitudes } from './custodios/ListaSolicitudes';

/**
 * Apartado «Administración»: herramientas para que el analista gestione custodios
 * desde el panel (en lugar de necesitar ejecutar scripts CLI).
 *
 * Incluye:
 * - Formulario para solicitar la creación de un custodio nuevo
 * - Lista del estado de solicitudes recientes
 */
export function AdministracionSection() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-border border-b px-8 py-6">
        <div className="flex items-center gap-3">
          <h1 className="text-text text-2xl font-semibold tracking-tight">Administración</h1>
          <Badge variant="neutral" pill>
            GESTIÓN INTERNA
          </Badge>
        </div>
        <p className="text-text-muted mt-2 text-sm">
          Alta de custodios y administración del sistema
        </p>
      </header>

      <div className="no-imprimir flex flex-1 flex-col overflow-hidden">
        <div className="grid flex-1 gap-8 overflow-y-auto px-8 py-6 lg:grid-cols-2">
          {/* Columna 1: Formulario */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <Settings className="text-text-muted size-5" aria-hidden="true" />
              <h2 className="text-text text-lg font-semibold">Agregar Custodio</h2>
            </div>
            <FormularioCustodio />
          </div>

          {/* Columna 2: Estado de solicitudes */}
          <div className="flex flex-col gap-6">
            <h2 className="text-text text-lg font-semibold">Solicitudes Recientes</h2>
            <ListaSolicitudes />
          </div>
        </div>
      </div>
    </div>
  );
}
