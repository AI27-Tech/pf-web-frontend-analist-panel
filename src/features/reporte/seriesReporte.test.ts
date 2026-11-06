import { describe, expect, it } from 'vitest';

import type { FilaViaje, Medio } from '@/lib/datos/tipos';

import { archivosPorDia, viajesPorDia } from './seriesReporte';

const rango = { desde: '2026-09-01', hasta: '2026-09-03' };

function medio(parcial: Partial<Medio>): Medio {
  return { id: 'm', tipo: 'FOTO', fechaLocal: '2026-09-01', ...parcial } as Medio;
}

function viaje(parcial: Partial<FilaViaje>): FilaViaje {
  return {
    id: 'v',
    placas: 'ABC-123',
    custodios: [],
    fechaLocal: '2026-09-01',
    fotos: 0,
    audios: 0,
    ciclo: 'CERRADO',
    hayNovedad: false,
    ...parcial,
  };
}

describe('archivosPorDia', () => {
  it('cuenta fotos y audios por día e incluye los días sin archivos', () => {
    const serie = archivosPorDia(
      [
        medio({ tipo: 'FOTO', fechaLocal: '2026-09-01' }),
        medio({ tipo: 'FOTO', fechaLocal: '2026-09-01' }),
        medio({ tipo: 'AUDIO', fechaLocal: '2026-09-01' }),
        medio({ tipo: 'AUDIO', fechaLocal: '2026-09-03' }),
      ],
      rango,
    );
    expect(serie).toEqual([
      { dia: '2026-09-01', fotos: 2, audios: 1 },
      { dia: '2026-09-02', fotos: 0, audios: 0 },
      { dia: '2026-09-03', fotos: 0, audios: 1 },
    ]);
  });

  it('ignora archivos fuera del rango', () => {
    const serie = archivosPorDia([medio({ fechaLocal: '2026-08-31' })], rango);
    expect(serie.every((p) => p.fotos === 0 && p.audios === 0)).toBe(true);
  });

  it('sin archivos devuelve un punto en cero por día', () => {
    expect(archivosPorDia([], rango)).toHaveLength(3);
  });

  it('un rango invertido devuelve una serie vacía', () => {
    expect(archivosPorDia([], { desde: '2026-09-03', hasta: '2026-09-01' })).toEqual([]);
  });
});

describe('viajesPorDia', () => {
  it('cuenta los viajes de cada día e incluye los días sin viajes', () => {
    const serie = viajesPorDia(
      [
        viaje({ fechaLocal: '2026-09-01' }),
        // La novedad no cambia el conteo: la gráfica ya no distingue.
        viaje({ fechaLocal: '2026-09-01', hayNovedad: true }),
        viaje({ fechaLocal: '2026-09-03', hayNovedad: true }),
      ],
      rango,
    );
    expect(serie).toEqual([
      { dia: '2026-09-01', viajes: 2 },
      { dia: '2026-09-02', viajes: 0 },
      { dia: '2026-09-03', viajes: 1 },
    ]);
  });

  it('ignora viajes fuera del rango', () => {
    const serie = viajesPorDia([viaje({ fechaLocal: '2026-09-09' })], rango);
    expect(serie.every((p) => p.viajes === 0)).toBe(true);
  });
});
