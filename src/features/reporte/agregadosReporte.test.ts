import { describe, expect, it } from 'vitest';

import type { FilaViaje } from '@/lib/datos/tipos';

import { distribucionPorCiclo, viajesPorDia } from './agregadosReporte';

const viajes: FilaViaje[] = [
  {
    id: 'v1',
    placas: 'ABC-123',
    custodios: ['Ana'],
    fechaLocal: '2026-09-01',
    fotos: 4,
    audios: 1,
    ciclo: 'CERRADO',
    hayNovedad: false,
  },
  {
    id: 'v2',
    placas: 'ABC-123',
    custodios: ['Beto'],
    fechaLocal: '2026-09-01',
    fotos: 2,
    audios: 0,
    ciclo: 'ACTIVO',
    hayNovedad: true,
  },
  {
    id: 'v3',
    placas: 'XYZ-789',
    custodios: ['Ana', 'Beto'],
    fechaLocal: '2026-09-02',
    fotos: 3,
    audios: 1,
    ciclo: 'ACTIVO',
    hayNovedad: false,
  },
];

describe('viajesPorDia', () => {
  it('cuenta viajes por fecha, ordenado', () => {
    expect(viajesPorDia(viajes)).toEqual([
      { etiqueta: '09-01', valor: 2 },
      { etiqueta: '09-02', valor: 1 },
    ]);
  });

  it('ignora viajes sin fecha', () => {
    const conVacio: FilaViaje[] = [
      ...viajes,
      {
        id: 'v4',
        placas: 'P',
        custodios: [],
        fechaLocal: '',
        fotos: 0,
        audios: 0,
        ciclo: 'ACTIVO',
        hayNovedad: false,
      },
    ];
    expect(viajesPorDia(conVacio)).toHaveLength(2);
  });
});

describe('distribucionPorCiclo', () => {
  it('agrupa por estado con etiquetas legibles', () => {
    expect(distribucionPorCiclo(viajes)).toEqual(
      expect.arrayContaining([
        { categoria: 'Cerrado', valor: 1 },
        { categoria: 'Activo', valor: 2 },
      ]),
    );
  });

  it('con conjunto vacío devuelve arreglo vacío', () => {
    expect(distribucionPorCiclo([])).toEqual([]);
  });
});
