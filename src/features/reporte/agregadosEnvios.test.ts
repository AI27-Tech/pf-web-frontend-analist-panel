import { describe, expect, it } from 'vitest';

import type { FilaViaje } from '@/lib/datos/tipos';

import { SIN_ENVIO, estadisticasDeEnvios } from './agregadosEnvios';

function fila(extra: Partial<FilaViaje>): FilaViaje {
  return {
    id: 'r-1',
    placas: '042',
    custodios: ['u-1'],
    fechaLocal: '2026-11-26',
    fotos: 0,
    audios: 0,
    ciclo: 'CERRADO',
    hayNovedad: false,
    shipmentId: null,
    ...extra,
  };
}

describe('estadisticasDeEnvios', () => {
  it('agrupa por Shipment ID y suma validaciones (fotos + audios)', () => {
    const porViaje = [
      fila({ id: 'r-1', shipmentId: 'S-100', fotos: 2, audios: 1 }),
      fila({ id: 'r-2', shipmentId: 'S-100', fotos: 1 }),
      fila({ id: 'r-3', shipmentId: 'S-103', fotos: 0 }),
    ];

    expect(estadisticasDeEnvios(porViaje)).toEqual([
      { shipmentId: 'S-100', seguimientos: 2, validaciones: 4 },
      { shipmentId: 'S-103', seguimientos: 1, validaciones: 0 },
    ]);
  });

  it('los descartados no cuentan', () => {
    const porViaje = [
      fila({ id: 'r-1', shipmentId: 'S-100', fotos: 5 }),
      fila({ id: 'r-2', shipmentId: 'S-100', fotos: 9, ciclo: 'DESCARTADO' }),
    ];

    expect(estadisticasDeEnvios(porViaje)).toEqual([
      { shipmentId: 'S-100', seguimientos: 1, validaciones: 5 },
    ]);
  });

  it('los reportes sin vínculo se agrupan en «Sin envío»', () => {
    const porViaje = [
      fila({ id: 'r-1', shipmentId: null, fotos: 2 }),
      fila({ id: 'r-2', shipmentId: '', fotos: 1 }),
      fila({ id: 'r-3', shipmentId: 'S-100', fotos: 0 }),
    ];

    expect(estadisticasDeEnvios(porViaje)).toEqual([
      { shipmentId: SIN_ENVIO, seguimientos: 2, validaciones: 3 },
      { shipmentId: 'S-100', seguimientos: 1, validaciones: 0 },
    ]);
  });

  it('ordena por validaciones y luego por seguimientos', () => {
    const porViaje = [
      fila({ id: 'r-1', shipmentId: 'S-A', fotos: 1 }),
      fila({ id: 'r-2', shipmentId: 'S-B', fotos: 1 }),
      fila({ id: 'r-3', shipmentId: 'S-B', fotos: 0 }),
      fila({ id: 'r-4', shipmentId: 'S-C', fotos: 9 }),
    ];

    expect(estadisticasDeEnvios(porViaje).map((e) => e.shipmentId)).toEqual(['S-C', 'S-B', 'S-A']);
  });
});
