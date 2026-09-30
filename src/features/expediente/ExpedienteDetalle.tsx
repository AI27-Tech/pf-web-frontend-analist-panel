import type { Medio, Viaje } from '@/lib/datos/tipos';

import { ExpedienteGaleria } from './ExpedienteGaleria';
import { ExpedienteHeader } from './ExpedienteHeader';
import { ExpedienteResumenCards } from './ExpedienteResumenCards';

/**
 * El expediente completo: cabecera con acciones, tarjetas de resumen y la galería
 * agrupada por etiqueta. Presentacional — recibe el viaje y sus medios ya resueltos por
 * props.
 */
export interface ExpedienteDetalleProps {
  viaje: Viaje;
  medios: Medio[];
  mediosError?: string | null;
  cargandoMedios?: boolean;
}

export function ExpedienteDetalle({
  viaje,
  medios,
  mediosError = null,
  cargandoMedios = false,
}: ExpedienteDetalleProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ExpedienteHeader viaje={viaje} />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-8 py-6">
        <ExpedienteResumenCards viaje={viaje} />
        <ExpedienteGaleria medios={medios} mediosError={mediosError} cargando={cargandoMedios} />
      </div>
    </div>
  );
}
