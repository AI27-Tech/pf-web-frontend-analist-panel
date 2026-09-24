import { Badge, Card } from '@ai27-tech/ui';
import { Calendar, ChevronRight, Files, Truck, User } from 'lucide-react';

import { fechaHoraDeViaje } from '@/lib/formato/fechas';
import type { Viaje } from '@/lib/datos/tipos';

import { presentacionDeEstado } from './mapeoEstados';

/**
 * El renglón de un viaje dentro de `ViajesList`.
 */
export interface ViajeCardProps {
  viaje: Viaje;
  onAbrir: (id: string) => void;
}

export function ViajeCard({ viaje, onAbrir }: ViajeCardProps) {
  const nombreCustodio = viaje.custodioName ?? viaje.custodioCorreo;

  return (
    <Card
      variant="outlined"
      onClick={() => onAbrir(viaje.id)}
      className="w-full items-center gap-4 p-4 text-left"
      style={{ display: 'flex', flexDirection: 'row' }}
    >
      <div className="border-border flex size-12 shrink-0 items-center justify-center rounded border">
        <Truck className="text-text-muted size-6" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        {/* Línea 1: placas + un Badge por cada estado operativo */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-bold text-text">{viaje.placas}</span>
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

        {/* Línea 2: fecha de apertura, custodio y conteo de archivos. */}
        <div className="text-text-muted mt-1 flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4" aria-hidden="true" />
            {fechaHoraDeViaje(viaje.abiertoEn)}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="size-4" aria-hidden="true" />
            Custodio: <span className="text-text font-semibold">{nombreCustodio}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Files className="size-4" aria-hidden="true" />
            <span className="cifras-tabulares">{viaje.uploadedFiles}</span> archivos
          </span>
        </div>
      </div>

      <ChevronRight className="text-text-muted size-5 shrink-0" aria-hidden="true" />
    </Card>
  );
}
