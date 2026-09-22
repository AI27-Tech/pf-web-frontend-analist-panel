/**
 * SOLO DESARROLLO: `usarMock` selecciona el arreglo estático de `viajesMock.ts` en
 * lugar de Firestore mientras las reglas del proyecto no autorizan al analista a
 * leer nada (docs/PLAN.md §6, fase F1).
 *
 */

import { listarViajesFirestore, obtenerViajeFirestore } from './viajesFirestore';
import { listarViajesMock, obtenerViajeMock } from './viajesMock';
import type { FiltrosViaje, Viaje, ViajesPage } from './tipos';

const usarMock = import.meta.env.VITE_DATOS_MOCK === 'true';

export function listarViajes(filtros: FiltrosViaje): Promise<ViajesPage> {
  return usarMock ? listarViajesMock(filtros) : listarViajesFirestore(filtros);
}

export function obtenerViaje(id: string): Promise<Viaje | null> {
  return usarMock ? obtenerViajeMock(id) : obtenerViajeFirestore(id);
}
