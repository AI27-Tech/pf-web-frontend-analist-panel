/**
 * SOLO DESARROLLO: `usarMock` selecciona el arreglo estático de `viajesMock.ts` en
 * lugar de Firestore mientras las reglas del proyecto no autorizan al analista a
 * leer nada (docs/PLAN.md §6, fase F1).
 *
 */

import {
  listarPlacasFirestore,
  listarViajesFirestore,
  obtenerViajeFirestore,
} from './viajesFirestore';
import { listarViajesMock, obtenerViajeMock, viajesEstaticos } from './viajesMock';
import type { FiltrosViaje, Viaje, ViajesPage } from './tipos';

const usarMock = import.meta.env.VITE_DATOS_MOCK === 'true';

/** Números económicos distintos de los viajes de un periodo (`desde`/`hasta` vacío = abierto). */
export function listarPlacas(rango: { desde: string; hasta: string }): Promise<string[]> {
  if (!usarMock) return listarPlacasFirestore(rango);
  const placas = new Set(
    viajesEstaticos
      .filter(
        (viaje) =>
          (!rango.desde || viaje.fechaLocal >= rango.desde) &&
          (!rango.hasta || viaje.fechaLocal <= rango.hasta),
      )
      .map((viaje) => viaje.placas),
  );
  return Promise.resolve([...placas].sort((a, b) => a.localeCompare(b, 'es')));
}

export function listarViajes(filtros: FiltrosViaje): Promise<ViajesPage> {
  return usarMock ? listarViajesMock(filtros) : listarViajesFirestore(filtros);
}

export function obtenerViaje(id: string): Promise<Viaje | null> {
  return usarMock ? obtenerViajeMock(id) : obtenerViajeFirestore(id);
}
