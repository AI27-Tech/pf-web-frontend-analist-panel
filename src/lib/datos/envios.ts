/**
 * Reporte por Shipment ID (Echo 04): dominio puro y conmutador de fuente de datos.
 *
 * Las funciones puras (`construirVistaEnvio`, `totalesDeEnvio`, `evaluarCorreccion`) viven
 * aquí para probarse sin Firebase; la lectura y la escritura reales están en
 * `enviosFirestore.ts` y los datos de desarrollo en `enviosMock.ts`.
 */

import type {
  Envio,
  EnvioSeguimiento,
  Medio,
  ReporteVinculado,
  ResultadoCorreccion,
  VistaEnvio,
} from './tipos';
import {
  corregirVinculacionFirestore,
  obtenerEnvioFirestore,
  obtenerVistaEnvioFirestore,
} from './enviosFirestore';
import { corregirVinculacionMock, obtenerEnvioMock, obtenerVistaEnvioMock } from './enviosMock';

/** Tope de archivos que se leen de un solo envío. Acota las lecturas (y el costo) de una
 *  visita a un envío con mucha actividad. Un envío normal no lo alcanza. */
export const TOPE_ENVIO = 5000;

/** `true` en desarrollo con `VITE_DATOS_MOCK=true`. La UI lo usa para no pedir miniaturas
 *  de Storage cuando los medios son estáticos. */
export const datosMockActivos = import.meta.env.VITE_DATOS_MOCK === 'true';

/**
 * Agrupa los medios por seguimiento y arma la vista del envío. Los medios de un
 * seguimiento van del más antiguo al más reciente; los seguimientos, del más reciente al
 * más antiguo. Los seguimientos sin medios aparecen con la lista vacía.
 */
export function construirVistaEnvio(
  envio: Envio,
  reportes: ReporteVinculado[],
  medios: Medio[],
  recortado: boolean,
): VistaEnvio {
  const mediosPorReporte = new Map<string, Medio[]>();
  for (const medio of medios) {
    const lista = mediosPorReporte.get(medio.viajeId) ?? [];
    lista.push(medio);
    mediosPorReporte.set(medio.viajeId, lista);
  }
  for (const lista of mediosPorReporte.values()) {
    lista.sort((a, b) => a.capturadoEn.getTime() - b.capturadoEn.getTime());
  }
  const seguimientos: EnvioSeguimiento[] = reportes
    .map((reporte) => ({ ...reporte, medios: mediosPorReporte.get(reporte.id) ?? [] }))
    .sort((a, b) => b.abiertoEn.getTime() - a.abiertoEn.getTime());
  return { envio, seguimientos, recortado };
}

/**
 * Totales del envío. Un descarte es `ciclo == 'DESCARTADO'`: no se lista ni su evidencia
 * suma validaciones. Cada documento de medio cuenta una validación, foto y audio por
 * separado; una miniatura no cuenta porque `thumbnailPath` es un campo del mismo
 * documento de medio.
 */
export function totalesDeEnvio(seguimientos: EnvioSeguimiento[]): {
  seguimientos: number;
  validaciones: number;
} {
  const contados = seguimientos.filter((seguimiento) => seguimiento.ciclo !== 'DESCARTADO');
  return {
    seguimientos: contados.length,
    validaciones: contados.reduce((total, seguimiento) => total + seguimiento.medios.length, 0),
  };
}

/**
 * Decisión pura de la corrección del vínculo. Devuelve `{ ok: false }` con el mensaje del
 * destino inválido, `{ ok: true, cambio: false }` cuando el valor ya es ese (sin
 * escritura) y `{ ok: true, cambio: true }` cuando hay que escribir.
 */
export function evaluarCorreccion({
  vinculacionActual,
  shipmentIdActual,
  destino,
  envioDestino,
  clienteReporte,
}: {
  /** `vinculacion` actual del reporte: `'VINCULADO' | 'SIN_ENVIO' | null`. */
  vinculacionActual: string | null;
  /** `shipmentId` actual del reporte (puede no haber). */
  shipmentIdActual: string | null;
  /** Destino elegido: un Shipment ID o `null` para dejar `SIN_ENVIO`. */
  destino: string | null;
  /** Documento del envío destino, o `null` si no existe. */
  envioDestino: { clienteId: string } | null;
  /** `clienteId` del seguimiento que se corrige. */
  clienteReporte: string;
}): ResultadoCorreccion {
  if (destino === null) {
    if (shipmentIdActual === null && vinculacionActual === 'SIN_ENVIO') {
      return { ok: true, cambio: false };
    }
    return { ok: true, cambio: true };
  }
  if (!envioDestino) return { ok: false, mensaje: 'No encontramos el envío.' };
  if (envioDestino.clienteId !== clienteReporte) {
    return { ok: false, mensaje: 'El envío es de otra empresa.' };
  }
  if (destino === shipmentIdActual && vinculacionActual === 'VINCULADO') {
    return { ok: true, cambio: false };
  }
  return { ok: true, cambio: true };
}

/** Cabecera del envío, o `null` si no existe o el Cliente no lo debe ver. */
export function obtenerEnvio(shipmentId: string): Promise<Envio | null> {
  return datosMockActivos ? obtenerEnvioMock(shipmentId) : obtenerEnvioFirestore(shipmentId);
}

/** Vista completa del envío, o `null` si no existe o el Cliente no lo debe ver. */
export function obtenerVistaEnvio(shipmentId: string): Promise<VistaEnvio | null> {
  return datosMockActivos
    ? obtenerVistaEnvioMock(shipmentId)
    : obtenerVistaEnvioFirestore(shipmentId);
}

/** Corrige el vínculo de un seguimiento. Sólo el Analista; la autorización real es la
 *  regla de 01 (pendiente en esa issue); el panel pre-checa para dar el mensaje. */
export function corregirVinculacion(opciones: {
  reporteId: string;
  shipmentId: string | null;
}): Promise<ResultadoCorreccion> {
  return datosMockActivos
    ? corregirVinculacionMock(opciones)
    : corregirVinculacionFirestore(opciones);
}
