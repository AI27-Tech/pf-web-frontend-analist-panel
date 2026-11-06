import { describe, expect, it } from 'vitest';

import type { Viaje } from './tipos';
import { queryViajes } from './viajesQuery';
import { viajesEstaticos } from './viajesMock';

/** Un viaje de muestra con los campos que importan para el orden. */
function viaje(id: string, fechaLocal: string, abiertoEn: string, placas = 'ABC123'): Viaje {
  const base = viajesEstaticos[0]!;
  return { ...base, id, fechaLocal, abiertoEn: new Date(abiertoEn), placas };
}

const filtros = { desde: '2026-09-01', hasta: '2026-09-30', page: 1, pageSize: 50 };
const ids = (viajes: Viaje[]) => viajes.map((v) => v.id);

describe('queryViajes (orden)', () => {
  it('ordena del más reciente al más antiguo: primero el día, luego la hora de apertura', () => {
    const lista = [
      viaje('manana-temprano', '2026-09-10', '2026-09-10T14:00:00Z'),
      viaje('ayer', '2026-09-09', '2026-09-09T20:00:00Z'),
      viaje('manana-tarde', '2026-09-10', '2026-09-10T23:00:00Z'),
    ];

    expect(ids(queryViajes(lista, filtros).viajes)).toEqual([
      'manana-tarde',
      'manana-temprano',
      'ayer',
    ]);
  });

  it('con la misma hora de apertura desempata por id, de forma determinista', () => {
    const lista = [
      viaje('b', '2026-09-10', '2026-09-10T14:00:00Z'),
      viaje('a', '2026-09-10', '2026-09-10T14:00:00Z'),
    ];

    expect(ids(queryViajes(lista, filtros).viajes)).toEqual(['a', 'b']);
  });

  it('el orden se conserva al filtrar', () => {
    const lista = [
      viaje('x-temprano', '2026-09-10', '2026-09-10T14:00:00Z', 'XYZ'),
      viaje('otra', '2026-09-10', '2026-09-10T18:00:00Z', 'ABC'),
      viaje('x-tarde', '2026-09-10', '2026-09-10T22:00:00Z', 'XYZ'),
    ];

    expect(ids(queryViajes(lista, { ...filtros, placas: 'xyz' }).viajes)).toEqual([
      'x-tarde',
      'x-temprano',
    ]);
  });
});
