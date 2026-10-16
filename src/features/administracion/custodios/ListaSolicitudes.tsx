import { Badge, type BadgeVariant } from '@ai27-tech/ui';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { escucharSolicitudesCustodios, type SolicitudCustodio } from '@/lib/datos/administracion';

/**
 * Lista de solicitudes recientes de creación de custodios.
 *
 * Escucha cambios en tiempo real y muestra:
 * - Correo y nombre del custodio
 * - Estado actual (PENDIENTE, COMPLETADO, ERROR)
 * - Fecha de solicitud y resultado
 */
export function ListaSolicitudes() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCustodio[]>([]);
  // `recibido` marca que el listener ya respondió al menos una vez. Distingue
  // "todavía cargando" de "cargó y está vacío". Se setea dentro del callback del
  // listener (no en el cuerpo del effect), que es un patrón permitido.
  const [recibido, setRecibido] = useState(false);

  useEffect(() => {
    // Suscribirse a cambios en tiempo real
    const unsub = escucharSolicitudesCustodios((nuevas: SolicitudCustodio[]) => {
      setSolicitudes(nuevas);
      setRecibido(true);
    });

    // Desuscribirse al desmontar
    return unsub;
  }, []);

  // Mientras el listener no ha respondido, mostrar skeleton de carga
  if (!recibido) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface border-border h-16 animate-pulse rounded border" />
        ))}
      </div>
    );
  }

  // Ya respondió y no hay solicitudes: mostrar mensaje de vacío
  if (solicitudes.length === 0) {
    return (
      <div className="text-text-muted border-border bg-surface/50 flex flex-col items-center justify-center rounded border py-8 text-center">
        <Clock className="text-text-muted mb-2 size-6" aria-hidden="true" />
        <p className="text-sm">No hay solicitudes recientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {solicitudes.map((solicitud) => (
        <RenglonSolicitud key={solicitud.id} solicitud={solicitud} />
      ))}
    </div>
  );
}

function RenglonSolicitud({ solicitud }: { solicitud: SolicitudCustodio }) {
  const iconoEstadoMap: Record<'PENDIENTE' | 'COMPLETADO' | 'ERROR', React.ReactNode> = {
    PENDIENTE: <Clock className="size-4" />,
    COMPLETADO: <CheckCircle className="size-4" />,
    ERROR: <XCircle className="size-4" />,
  };

  const colorEstadoMap: Record<'PENDIENTE' | 'COMPLETADO' | 'ERROR', BadgeVariant> = {
    PENDIENTE: 'neutral',
    COMPLETADO: 'secure',
    ERROR: 'warning',
  };

  const iconoEstado = iconoEstadoMap[solicitud.estado];
  const colorEstado = colorEstadoMap[solicitud.estado];

  const formatoFecha = (fecha: Date) => {
    return fecha.toLocaleString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="border-border bg-surface rounded border p-4">
      {/* Header: correo + estado */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-text truncate font-semibold">{solicitud.correo}</p>
          {solicitud.nombre && (
            <p className="text-text-muted truncate text-sm">{solicitud.nombre}</p>
          )}
        </div>
        <Badge variant={colorEstado} pill className="shrink-0">
          <span className="flex items-center gap-2">
            {iconoEstado}
            <span>{solicitud.estado}</span>
          </span>
        </Badge>
      </div>

      {/* Timeline de fechas */}
      <div className="space-y-2 text-xs">
        <div className="text-text-muted flex items-center justify-between">
          <span>Solicitado</span>
          <span className="font-mono">{formatoFecha(solicitud.solicitadoEn)}</span>
        </div>

        {solicitud.procesadoEn && (
          <div className="text-text-muted flex items-center justify-between">
            <span>Procesado</span>
            <span className="font-mono">{formatoFecha(solicitud.procesadoEn)}</span>
          </div>
        )}
      </div>

      {/* Mensaje de error */}
      {solicitud.estado === 'ERROR' && solicitud.error && (
        <div className="bg-danger/5 text-danger mt-3 rounded p-2 text-xs">{solicitud.error}</div>
      )}

      {/* Resultado exitoso */}
      {solicitud.estado === 'COMPLETADO' && solicitud.resultado && (
        <div className="text-text-muted mt-3 text-xs">
          <span>UID: </span>
          <code className="bg-surface-alt rounded px-1 py-0.5 font-mono text-xs">
            {solicitud.resultado.uid.slice(0, 8)}…
          </code>
        </div>
      )}
    </div>
  );
}
