import { beforeEach, describe, expect, it, vi } from 'vitest';

// Se stubea el SDK de Firestore: `getDocs` devuelve los documentos de cada rango según
// el orden de las cuatro consultas (reportesA, reportesP, mediosA, mediosP). Así se
// prueba la DERIVACIÓN en el cliente (deltas, efectividad, descartes, cubetas horarias,
// acumulado de GB) sin Firestore real y sin depender de índices.

const getDocsMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  getDocs: (...a: unknown[]) => getDocsMock(...a),
  limit: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  query: vi.fn((_c: unknown, ...rest: unknown[]) => ({ rest })),
  where: vi.fn((campo: string, op: string, valor: unknown) => ({ campo, op, valor })),
}));
vi.mock('@/lib/firebase/cliente', () => ({ firestore: {} }));

import { obtenerMetricasFirestore } from './metricasFirestore';

const periodo = { desde: '2026-09-01', hasta: '2026-09-30' };

/** Snapshot con `docs` a partir de un arreglo de datos crudos. */
const snap = (datos: Record<string, unknown>[]) => ({ docs: datos.map((d) => ({ data: () => d })) });

function reporte(overrides: Record<string, unknown> = {}) {
  return { ciclo: 'CERRADO', hayNovedad: false, motivoDescarte: null, ...overrides };
}
function medio(overrides: Record<string, unknown> = {}) {
  return {
    tipo: 'FOTO',
    fechaLocal: '2026-09-10',
    sizeBytes: 1024 * 1024,
    createdAtDevice: { toDate: () => new Date('2026-09-10T15:30:00Z') },
    ...overrides,
  };
}

/** Encola las cuatro respuestas en el orden que las pide obtenerMetricasFirestore:
 *  reportesA, reportesP, mediosA, mediosP. */
function encolar(rA: unknown[], rP: unknown[], mA: unknown[], mP: unknown[]) {
  getDocsMock
    .mockResolvedValueOnce(snap(rA as Record<string, unknown>[]))
    .mockResolvedValueOnce(snap(rP as Record<string, unknown>[]))
    .mockResolvedValueOnce(snap(mA as Record<string, unknown>[]))
    .mockResolvedValueOnce(snap(mP as Record<string, unknown>[]));
}

beforeEach(() => {
  getDocsMock.mockReset();
});

describe('obtenerMetricasFirestore (lectura acotada + agregación en cliente)', () => {
  it('deriva las estadísticas de cabecera y el folio', async () => {
    // Actual: 3 reportes (2 cerrados, 1 con novedad), 4 fotos. Anterior: 2 reportes, 2 fotos.
    encolar(
      [reporte(), reporte(), reporte({ ciclo: 'ACTIVO', hayNovedad: true })],
      [reporte(), reporte()],
      [medio(), medio(), medio(), medio()],
      [medio(), medio()],
    );

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.folio).toBe('EXP-2026-09-MX');
    expect(m.estadisticas.viajesAuditados.valor).toBe('3');
    expect(m.estadisticas.viajesAuditados.delta).toBeCloseTo(0.5); // (3-2)/2
    expect(m.estadisticas.incidenciasRegistradas.valor).toBe('1');
    expect(m.estadisticas.evidenciasFotograficas.valor).toBe('4');
    expect(m.estadisticas.evidenciasFotograficas.delta).toBeCloseTo(1); // (4-2)/2
    // 2 cerrados, ambos sin novedad -> 100%.
    expect(m.estadisticas.efectividadCustodia.valor).toBe('100.0%');
  });

  it('efectividad es «—» cuando no hay viajes cerrados', async () => {
    encolar([reporte({ ciclo: 'ACTIVO' })], [], [], []);

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.estadisticas.efectividadCustodia.valor).toBe('—');
    expect(m.estadisticas.efectividadCustodia.delta).toBeNull();
  });

  it('agrupa los descartes por motivo', async () => {
    encolar(
      [
        reporte({ ciclo: 'DESCARTADO', motivoDescarte: 'Ruta modificada' }),
        reporte({ ciclo: 'DESCARTADO', motivoDescarte: 'Ruta modificada' }),
        reporte({ ciclo: 'DESCARTADO', motivoDescarte: null }),
        reporte({ ciclo: 'CERRADO' }),
      ],
      [],
      [],
      [],
    );

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.graficas.descartesPorMotivo).toEqual(
      expect.arrayContaining([
        { categoria: 'Ruta modificada', valor: 2 },
        { categoria: 'Sin motivo registrado', valor: 1 },
      ]),
    );
  });

  it('cubetea capturas por hora (MX) y acumula GB por día', async () => {
    encolar(
      [],
      [],
      [
        // 15:30 UTC = 09:30 en America/Mexico_City (UTC-6) -> cubeta 09h.
        medio({ fechaLocal: '2026-09-10', sizeBytes: 1024 * 1024 * 1024 }),
        medio({ fechaLocal: '2026-09-11', sizeBytes: 1024 * 1024 * 1024 }),
      ],
      [],
    );

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.graficas.capturasPorHora.find((p) => p.etiqueta === '09h')?.valor).toBe(2);
    expect(m.graficas.gbAcumulados).toEqual([
      { etiqueta: '09-10', valor: 1 },
      { etiqueta: '09-11', valor: 2 },
    ]);
  });
});
