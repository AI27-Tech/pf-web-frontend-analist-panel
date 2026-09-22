import type { BadgeVariant } from '@ai27-tech/ui';

import type { EstadoOperativo } from '@/lib/datos/tipos';

/**
 * Traduce un `EstadoOperativo` a lo que un `Badge` necesita para presentarlo:
 * rótulo, variante de color, punto de estado y animación de pulso.
 *
 * Función pura: sin React y sin capa de datos. Es lo que permite comprobar la tabla
 * completa con Vitest sin montar un componente (design.md §mapeoEstados.ts).
 */
export interface PresentacionEstado {
  etiqueta: string;
  variant: BadgeVariant;
  dot: boolean;
  pulse: boolean;
}

const TABLA: Record<EstadoOperativo, PresentacionEstado> = {
  // Viaje vigente y sin incidencia.
  activo: { etiqueta: 'Activo', variant: 'secure', dot: true, pulse: false },
  // Única condición de la lista que exige acción AHORA. `alert` + pulso es el máximo
  // énfasis disponible.
  alerta_desvio: {
    etiqueta: 'Alerta de desvío',
    variant: 'alert',
    dot: true,
    pulse: true,
  },
  en_ruta: { etiqueta: 'En ruta', variant: 'escort', dot: true, pulse: false },
  // Ausencia de eventos.
  sin_novedad: { etiqueta: 'Sin novedad', variant: 'neutral', dot: false, pulse: false },
  // Evidencia cerrada e íntegra. Comparte `secure` con `activo`.
  sellado_forense: {
    etiqueta: 'Sellado forense',
    variant: 'secure',
    dot: false,
    pulse: false,
  },
  en_revision: { etiqueta: 'En revisión', variant: 'warning', dot: true, pulse: false },
  sin_senal: { etiqueta: 'Pérdida de señal', variant: 'warning', dot: true, pulse: true },
  // Transferencia ocurriendo en este momento.
  sincronizacion_en_vivo: {
    etiqueta: 'Sincronización en vivo',
    variant: 'escort',
    dot: true,
    pulse: true,
  },
  // Dato administrativo de conteo, sin carga de riesgo.
  expedientes_registrados: {
    etiqueta: 'Expedientes registrados',
    variant: 'neutral',
    dot: false,
    pulse: false,
  },
};

/**
 * Respaldo de un valor desconocido (R9.5): rótulo = el valor recibido, sin punto ni
 * pulso, variante `neutral`. El parámetro acepta `string` además de `EstadoOperativo`
 * a propósito: el día que Firestore traiga un valor nuevo que la unión literal no
 * admite en el tipo, el dato va a llegar igual, y aceptar `string` aquí es lo que
 * hace comprobable ese respaldo con una prueba en lugar de dejarlo como comentario.
 */
export function presentacionDeEstado(estado: EstadoOperativo | string): PresentacionEstado {
  const conocido = TABLA[estado as EstadoOperativo];
  if (conocido) {
    return conocido;
  }
  return { etiqueta: estado, variant: 'neutral', dot: false, pulse: false };
}
