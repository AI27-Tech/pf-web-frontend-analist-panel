import type { EstadisticaEnvio, FilaViaje } from '@/lib/datos/tipos';

/** Rótulo de la barra que agrupa los reportes sin vínculo. No es un envío real. */
export const SIN_ENVIO = 'Sin envío';

/**
 * Envíos del periodo para la gráfica del tablero: una entrada por Shipment ID (o
 * «Sin envío» para los reportes sin vínculo). Los descartados no cuentan; las
 * validaciones son las fotos más los audios de los seguimientos contados, el mismo
 * número que ya muestra «Registro por viaje». Ordenado por validaciones y luego
 * seguimientos, descendente.
 */
export function estadisticasDeEnvios(porViaje: FilaViaje[]): EstadisticaEnvio[] {
  const porEnvio = new Map<string, EstadisticaEnvio>();
  for (const viaje of porViaje) {
    if (viaje.ciclo === 'DESCARTADO') continue;
    const clave = viaje.shipmentId || SIN_ENVIO;
    const actual = porEnvio.get(clave) ?? {
      shipmentId: clave,
      seguimientos: 0,
      validaciones: 0,
    };
    actual.seguimientos += 1;
    actual.validaciones += viaje.fotos + viaje.audios;
    porEnvio.set(clave, actual);
  }
  return [...porEnvio.values()].sort(
    (a, b) => b.validaciones - a.validaciones || b.seguimientos - a.seguimientos,
  );
}
