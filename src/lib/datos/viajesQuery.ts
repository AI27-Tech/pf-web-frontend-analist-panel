/**
 * Lógica pura de consulta de viajes: rango de fechas, igualdades, pertenencia,
 * coincidencia parcial de texto, orden y corte de la página.
 */

import type { FiltrosViaje, Viaje, ViajesPage } from './tipos';

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-MX');
}

/**
 * Coincidencia parcial de un valor del viaje contra un criterio del analista.
 */
function coincideTexto(valor: string | undefined, criterio: string): boolean {
  return valor === undefined ? false : normalizar(valor).includes(normalizar(criterio));
}

/**
 * Orden descendente por `fechaLocal`, con `id` ascendente de desempate.
 */
function compararViajes(a: Viaje, b: Viaje): number {
  if (a.fechaLocal !== b.fechaLocal) return a.fechaLocal < b.fechaLocal ? 1 : -1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

/**
 * Filtra, ordena y corta una página de viajes.
 */
export function queryViajes(viajes: Viaje[], filtros: FiltrosViaje): ViajesPage {
  // PASO 1 — Rango de fechas.
  let resultado = viajes.filter(
    (viaje) => viaje.fechaLocal >= filtros.desde && viaje.fechaLocal <= filtros.hasta,
  );

  // PASO 2 — Igualdades y pertenencia.
  if (filtros.custodioUid) {
    const custodioUid = filtros.custodioUid;
    resultado = resultado.filter((viaje) => viaje.custodioUid === custodioUid);
  }

  if (filtros.etiqueta) {
    const etiqueta = filtros.etiqueta;
    resultado = resultado.filter((viaje) => viaje.etiquetas.includes(etiqueta));
  }

  if (filtros.isUpdated !== undefined) {
    const isUpdated = filtros.isUpdated;
    resultado = resultado.filter((viaje) => viaje.isUpdated === isUpdated);
  }

  // PASO 3 — Coincidencia parcial normalizada de los dos criterios de texto.
  if (filtros.placas) {
    const criterio = filtros.placas;
    resultado = resultado.filter((viaje) => coincideTexto(viaje.placas, criterio));
  }

  if (filtros.custodioName) {
    const criterio = filtros.custodioName;
    resultado = resultado.filter((viaje) => coincideTexto(viaje.custodioName, criterio));
  }

  // PASO 4 — Orden y corte.
  //
  // Se ordena una copia: la consulta no muta el arreglo que recibe. El `total` se toma
  // ANTES del corte, porque es la cantidad de viajes que satisfacen los filtros y es lo
  // que la paginación necesita para saber cuántas páginas hay; tomarlo después diría
  // siempre «una página».
  const ordenados = [...resultado].sort(compararViajes);
  const total = ordenados.length;

  return {
    viajes: ordenados.slice((filtros.page - 1) * filtros.pageSize, filtros.page * filtros.pageSize),
    total,
  };
}
