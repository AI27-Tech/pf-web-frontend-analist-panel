import { describe, expect, it } from 'vitest';

import type { EstadisticaCustodio, FilaViaje } from '@/lib/datos/tipos';

import {
  FILTRO_VACIO,
  filtrarCustodios,
  filtrarViajes,
  hayFiltroActivo,
  type FiltroReporte,
} from './filtros';

const custodios: EstadisticaCustodio[] = [
  { uid: 'c1', nombre: 'Jesús Pérez', viajes: 3, fotos: 10, audios: 2 },
  { uid: 'c2', nombre: 'Mayra García', viajes: 1, fotos: 4, audios: 0 },
];

const viajes: FilaViaje[] = [
  {
    id: 'v1',
    placas: 'ABC-123',
    custodios: ['Jesús Pérez'],
    fechaLocal: '2026-09-01',
    fotos: 5,
    audios: 1,
    ciclo: 'CERRADO',
    hayNovedad: false,
  },
  {
    id: 'v2',
    placas: 'XYZ-789',
    custodios: ['Mayra García'],
    fechaLocal: '2026-09-02',
    fotos: 4,
    audios: 0,
    ciclo: 'ACTIVO',
    hayNovedad: true,
  },
  {
    id: 'v3',
    placas: 'ABC-123',
    custodios: ['Jesús Pérez', 'Mayra García'],
    fechaLocal: '2026-09-03',
    fotos: 5,
    audios: 1,
    ciclo: 'ACTIVO',
    hayNovedad: false,
  },
];

function filtro(parcial: Partial<FiltroReporte>): FiltroReporte {
  return { ...FILTRO_VACIO, ...parcial };
}

describe('hayFiltroActivo', () => {
  it('es falso con el filtro vacío', () => {
    expect(hayFiltroActivo(FILTRO_VACIO)).toBe(false);
  });
  it('es verdadero si hay texto, custodio o unidad', () => {
    expect(hayFiltroActivo(filtro({ texto: 'abc' }))).toBe(true);
    expect(hayFiltroActivo(filtro({ custodio: 'c1' }))).toBe(true);
    expect(hayFiltroActivo(filtro({ unidad: 'ABC-123' }))).toBe(true);
  });
});

describe('filtrarCustodios', () => {
  it('sin filtro devuelve todos', () => {
    expect(filtrarCustodios(custodios, FILTRO_VACIO, viajes)).toHaveLength(2);
  });

  it('texto: coincidencia parcial normalizada (sin acentos ni mayúsculas)', () => {
    // "jesus" (sin acento, minúsculas) coincide con "Jesús Pérez".
    const r = filtrarCustodios(custodios, filtro({ texto: 'jesus' }), viajes);
    expect(r.map((c) => c.uid)).toEqual(['c1']);
  });

  it('custodio: acota al uid seleccionado', () => {
    const r = filtrarCustodios(custodios, filtro({ custodio: 'c2' }), viajes);
    expect(r.map((c) => c.uid)).toEqual(['c2']);
  });

  it('unidad: sólo custodios que participaron en esa placa', () => {
    // XYZ-789 sólo la trabajó Mayra García.
    const r = filtrarCustodios(custodios, filtro({ unidad: 'XYZ-789' }), viajes);
    expect(r.map((c) => c.uid)).toEqual(['c2']);
  });

  it('combina criterios con AND', () => {
    // texto "garcia" + unidad ABC-123: Mayra participó en ABC-123 (v3), así que pasa.
    expect(
      filtrarCustodios(custodios, filtro({ texto: 'garcia', unidad: 'ABC-123' }), viajes),
    ).toHaveLength(1);
    // texto "garcia" + unidad XYZ-789 (donde también está): pasa.
    expect(
      filtrarCustodios(custodios, filtro({ texto: 'jesus', unidad: 'XYZ-789' }), viajes),
    ).toHaveLength(0);
  });
});

describe('filtrarViajes', () => {
  it('sin filtro devuelve todos', () => {
    expect(filtrarViajes(viajes, FILTRO_VACIO, custodios)).toHaveLength(3);
  });

  it('texto: coincide por placa', () => {
    const r = filtrarViajes(viajes, filtro({ texto: 'xyz' }), custodios);
    expect(r.map((v) => v.id)).toEqual(['v2']);
  });

  it('texto: coincide por nombre de custodio', () => {
    const r = filtrarViajes(viajes, filtro({ texto: 'perez' }), custodios);
    expect(r.map((v) => v.id)).toEqual(['v1', 'v3']);
  });

  it('custodio: viajes donde participó ese uid (cruce por nombre)', () => {
    const r = filtrarViajes(viajes, filtro({ custodio: 'c2' }), custodios);
    expect(r.map((v) => v.id)).toEqual(['v2', 'v3']);
  });

  it('unidad: viajes de esa placa exacta', () => {
    const r = filtrarViajes(viajes, filtro({ unidad: 'ABC-123' }), custodios);
    expect(r.map((v) => v.id)).toEqual(['v1', 'v3']);
  });

  it('combina criterios con AND', () => {
    // custodio c1 (Jesús) + unidad ABC-123: v1 y v3.
    const r = filtrarViajes(viajes, filtro({ custodio: 'c1', unidad: 'ABC-123' }), custodios);
    expect(r.map((v) => v.id)).toEqual(['v1', 'v3']);
  });
});
