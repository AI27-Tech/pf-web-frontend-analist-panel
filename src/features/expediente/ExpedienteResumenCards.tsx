import { Calendar, Files, Timer, User } from 'lucide-react';

import { TarjetaResumen } from '@/components/TarjetaResumen';
import { duracionEntre, fechaHoraDeViaje } from '@/lib/formato/fechas';
import type { Viaje } from '@/lib/datos/tipos';

/**
 * Las cuatro tarjetas de resumen del expediente: fecha de registro, custodio asignado,
 * archivos registrados y duración del viaje. Reutilizan `TarjetaResumen`, el mismo
 * diseño de la cabecera del reporte, para que ambas pantallas se vean iguales.
 *
 * Cada tarjeta usa sólo campos reales de `Viaje`.
 */
export interface ExpedienteResumenCardsProps {
  viaje: Viaje;
}

export function ExpedienteResumenCards({ viaje }: ExpedienteResumenCardsProps) {
  const nombreCustodio = viaje.custodioName ?? viaje.custodioCorreo;
  const enProgreso = viaje.cerradoEn === null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <TarjetaResumen
        titulo="Fecha de registro"
        Icono={Calendar}
        tamanoValor="medio"
        valor={fechaHoraDeViaje(viaje.abiertoEn)}
        contexto={
          <span className="flex items-center gap-1.5">
            <span
              className={
                enProgreso
                  ? 'bg-success inline-block size-1.5 rounded-full'
                  : 'bg-text-muted inline-block size-1.5 rounded-full'
              }
              aria-hidden="true"
            />
            {enProgreso ? 'En progreso' : `Cerrado ${fechaHoraDeViaje(viaje.cerradoEn!)}`}
          </span>
        }
      />

      <TarjetaResumen
        titulo="Custodio asignado"
        Icono={User}
        tamanoValor="medio"
        valor={<span className="truncate">{nombreCustodio}</span>}
        contexto={<span className="truncate">{viaje.custodioCorreo}</span>}
      />

      <TarjetaResumen
        titulo="Archivos registrados"
        Icono={Files}
        tamanoValor="medio"
        valor={
          <>
            {viaje.uploadedFiles}{' '}
            <span className="text-text-muted text-sm font-normal">Archivos</span>
          </>
        }
        contexto={`de ${viaje.mediosEsperados} esperados`}
      />

      <TarjetaResumen
        titulo="Duración del viaje"
        Icono={Timer}
        tamanoValor="medio"
        valor={duracionEntre(viaje.abiertoEn, viaje.cerradoEn)}
        contexto={enProgreso ? 'Transcurrido hasta ahora' : 'Duración total'}
      />
    </div>
  );
}
