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

// `obtenerMetricasFirestore` resuelve nombres de custodio con `obtenerNombresCustodios`,
// que lee `usuarios/{uid}` de Firestore. Se stubea el módulo para devolver un nombre
// legible por uid sin tocar Firestore, y así probar la agrupación de forma aislada.
vi.mock('./custodios', () => ({
  obtenerNombresCustodios: (uids: readonly string[]) =>
    Promise.resolve(new Map(uids.filter((u) => u.length > 0).map((u) => [u, `Custodio ${u}`]))),
}));

import { obtenerMetricasFirestore } from './metricasFirestore';

const periodo = { desde: '2026-09-01', hasta: '2026-09-30' };

/** Snapshot con `docs` a partir de un arreglo de datos crudos. El `id` del documento sale
 *  del campo `__id` (si se provee), para poder probar la agrupación por viaje que usa
 *  `doc.id`; ese campo no forma parte de `data()`. */
const snap = (datos: Record<string, unknown>[]) => ({
  docs: datos.map((d, i) => {
    const { __id, ...data } = d;
    return { id: typeof __id === 'string' ? __id : `doc-${i}`, data: () => data };
  }),
});

function reporte(overrides: Record<string, unknown> = {}) {
  return {
    ciclo: 'CERRADO',
    hayNovedad: false,
    motivoDescarte: null,
    custodioUid: '',
    placas: '',
    fechaLocal: '2026-09-10',
    ...overrides,
  };
}
function medio(overrides: Record<string, unknown> = {}) {
  return {
    tipo: 'FOTO',
    fechaLocal: '2026-09-10',
    sizeBytes: 1024 * 1024,
    createdAtDevice: { toDate: () => new Date('2026-09-10T15:30:00Z') },
    // El vínculo al viaje en la colección `medios` se llama `reporteId` (contrato del
    // productor, ver `medios.ts`), no `viajeId`.
    reporteId: '',
    custodioUid: '',
    ...overrides,
  };
}

// El doc de un reporte trae un `id` en Firestore; el snapshot del stub sólo expone
// `data()`, así que para las pruebas de agrupación se pasa el id dentro del override y
// se refleja como `id` del documento a través de un stub extendido más abajo.

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

  it('agrupa por custodio: cuenta viajes por reporte y fotos/audios por medio', async () => {
    encolar(
      [
        reporte({ __id: 'v1', custodioUid: 'c1' }),
        reporte({ __id: 'v2', custodioUid: 'c1' }),
        reporte({ __id: 'v3', custodioUid: 'c2' }),
      ],
      [],
      [
        medio({ reporteId: 'v1', custodioUid: 'c1', tipo: 'FOTO' }),
        medio({ reporteId: 'v1', custodioUid: 'c1', tipo: 'AUDIO' }),
        medio({ reporteId: 'v3', custodioUid: 'c2', tipo: 'FOTO' }),
      ],
      [],
    );

    const m = await obtenerMetricasFirestore(periodo);
    const c1 = m.porCustodio.find((c) => c.uid === 'c1');
    const c2 = m.porCustodio.find((c) => c.uid === 'c2');

    expect(c1).toEqual({ uid: 'c1', nombre: 'Custodio c1', viajes: 2, fotos: 1, audios: 1 });
    expect(c2).toEqual({ uid: 'c2', nombre: 'Custodio c2', viajes: 1, fotos: 1, audios: 0 });
  });

  it('agrupa por viaje: un renglón por reporte, con custodios y conteos de medios', async () => {
    encolar(
      [reporte({ __id: 'v1', custodioUid: 'c1', placas: 'ABC-123', ciclo: 'CERRADO' })],
      [],
      [
        medio({ reporteId: 'v1', custodioUid: 'c1', tipo: 'FOTO' }),
        medio({ reporteId: 'v1', custodioUid: 'c1', tipo: 'FOTO' }),
        // Segundo custodio en el mismo viaje: debe sumarse a la lista de custodios.
        medio({ reporteId: 'v1', custodioUid: 'c2', tipo: 'AUDIO' }),
      ],
      [],
    );

    const m = await obtenerMetricasFirestore(periodo);
    expect(m.porViaje).toHaveLength(1);
    const fila = m.porViaje[0]!;
    expect(fila.id).toBe('v1');
    expect(fila.placas).toBe('ABC-123');
    expect(fila.fotos).toBe(2);
    expect(fila.audios).toBe(1);
    expect(fila.ciclo).toBe('CERRADO');
    expect(fila.custodios).toEqual(expect.arrayContaining(['Custodio c1', 'Custodio c2']));
    expect(fila.custodios).toHaveLength(2);
  });

  it('agrupa por unidad: cuenta viajes por placa, ordenado descendente', async () => {
    encolar(
      [
        reporte({ __id: 'v1', placas: 'ABC-123' }),
        reporte({ __id: 'v2', placas: 'ABC-123' }),
        reporte({ __id: 'v3', placas: 'XYZ-789' }),
        // Placa vacía: se omite del desglose por unidad.
        reporte({ __id: 'v4', placas: '' }),
      ],
      [],
      [],
      [],
    );

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.porUnidad).toEqual([
      { placas: 'ABC-123', viajes: 2 },
      { placas: 'XYZ-789', viajes: 1 },
    ]);
  });
});
