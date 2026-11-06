import { describe, expect, it } from 'vitest';

import type { EstadisticaCustodio } from '@/lib/datos/tipos';

import { buscarUnidades } from './buscarUnidades';

const custodios: EstadisticaCustodio[] = [
  { uid: 'c', nombre: 'Mayra García', viajes: 1, fotos: 0, audios: 0 },
  { uid: 'a', nombre: 'Jesús Pérez', viajes: 1, fotos: 0, audios: 0 },
  { uid: 'b', nombre: 'Jessica Ruiz', viajes: 1, fotos: 0, audios: 0 },
];

describe('buscarUnidades', () => {
  it('sin texto devuelve todas las unidades en orden alfabético', () => {
    expect(buscarUnidades(custodios, '').map((c) => c.uid)).toEqual(['b', 'a', 'c']);
    expect(buscarUnidades(custodios, '   ')).toHaveLength(3);
  });

  it('coincide sin acentos ni mayúsculas y ordena alfabéticamente', () => {
    expect(buscarUnidades(custodios, 'JES').map((c) => c.uid)).toEqual(['b', 'a']);
    expect(buscarUnidades(custodios, 'garcia').map((c) => c.uid)).toEqual(['c']);
  });

  it('coincide en cualquier parte del nombre', () => {
    expect(buscarUnidades(custodios, 'perez').map((c) => c.uid)).toEqual(['a']);
  });

  it('sin coincidencias devuelve lista vacía', () => {
    expect(buscarUnidades(custodios, 'zzz')).toEqual([]);
  });
});
