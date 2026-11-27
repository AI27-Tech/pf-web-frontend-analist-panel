import { beforeEach, describe, expect, it, vi } from 'vitest';

// Se stubea el SDK de Firestore: `getDocs` devuelve los documentos de cada lectura según
// el orden de las tres consultas (reportes del periodo, reportes del periodo anterior y
// medios del periodo). Así se prueba la DERIVACIÓN en el cliente (deltas, descartes,
// cubetas horarias, acumulado de GB, conteos desde el reporte) sin Firestore real y sin
// depender de índices.

const getDocsMock = vi.fn();
const getAggregateMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  count: vi.fn(() => ({})),
  getAggregateFromServer: (...a: unknown[]) => getAggregateMock(...a),
  getDocs: (...a: unknown[]) => getDocsMock(...a),
  limit: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  query: vi.fn((_c: unknown, ...rest: unknown[]) => ({ rest })),
  where: vi.fn((campo: string, op: string, valor: unknown) => ({ campo, op, valor })),
}));
vi.mock('@/lib/firebase/cliente', () => ({ firestore: {} }));
// El alcance de lectura lo resuelve la guarda; aquí el Analista lee sin filtro.
vi.mock('./accesoPanel', () => ({ alcanceLectura: vi.fn(async () => null) }));

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
 *  del campo `__id` (si se provee); ese campo no forma parte de `data()`. */
const snap = (datos: Record<string, unknown>[]) => ({
  docs: datos.map((d, i) => {
    const { __id, ...data } = d;
    return { id: typeof __id === 'string' ? __id : `doc-${i}`, data: () => data };
  }),
});

/** Reporte CERRADO con el desglose en `resumenMedios`, como lo escribe el productor. */
function reporte(overrides: Record<string, unknown> = {}) {
  return {
    ciclo: 'CERRADO',
    hayNovedad: false,
    motivoDescarte: null,
    custodioUid: '',
    placas: '',
    fechaLocal: '2026-09-10',
    mediosSubidos: 0,
    resumenMedios: { fotos: 0, audios: 0 },
    ...overrides,
  };
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

/** Encola las respuestas de documentos en el orden que las pide
 *  `obtenerMetricasFirestore`: reportes del periodo, métricas diarias del rango cerrado
 *  (vacías por omisión: caída a la lectura directa) y medios del periodo o del día. */
function encolar(rA: unknown[], mA: unknown[], agDiarias: unknown[] = []) {
  getDocsMock
    .mockResolvedValueOnce(snap(rA as Record<string, unknown>[]))
    .mockResolvedValueOnce(snap(agDiarias as Record<string, unknown>[]))
    .mockResolvedValueOnce(snap(mA as Record<string, unknown>[]));
}

/** Encola los seis conteos del servidor (actual y anterior) en su orden de llamada. */
function encolarConteos(c: {
  viajesA?: number;
  viajesP?: number;
  incidenciasA?: number;
  incidenciasP?: number;
  fotosA?: number;
  fotosP?: number;
}) {
  const total = (n: number) => ({ data: () => ({ total: n }) });
  for (const n of [
    c.viajesA ?? 0,
    c.viajesP ?? 0,
    c.incidenciasA ?? 0,
    c.incidenciasP ?? 0,
    c.fotosA ?? 0,
    c.fotosP ?? 0,
  ]) {
    getAggregateMock.mockResolvedValueOnce(total(n));
  }
}

beforeEach(() => {
  getDocsMock.mockReset();
  getAggregateMock.mockReset();
  getAggregateMock.mockImplementation(() => Promise.resolve({ data: () => ({ total: 0 }) }));
});

describe('obtenerMetricasFirestore (lectura acotada + agregación en cliente)', () => {
  it('deriva las estadísticas de cabecera y el folio desde los conteos del servidor', async () => {
    // Actual: 3 reportes, 1 con novedad, 4 fotos contadas en `medios`. Anterior: 2 y 2.
    encolar(
      [
        reporte({ resumenMedios: { fotos: 2, audios: 0 } }),
        reporte({ resumenMedios: { fotos: 1, audios: 1 } }),
        reporte({ ciclo: 'ACTIVO', hayNovedad: true, mediosSubidos: 1 }),
      ],
      [],
    );
    encolarConteos({
      viajesA: 3,
      viajesP: 2,
      incidenciasA: 1,
      incidenciasP: 0,
      fotosA: 4,
      fotosP: 2,
    });

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.folio).toBe('EXP-2026-09-MX');
    expect(m.estadisticas.viajesAuditados.valor).toBe('3');
    expect(m.estadisticas.viajesAuditados.delta).toBeCloseTo(0.5); // (3-2)/2
    expect(m.estadisticas.incidenciasRegistradas.valor).toBe('1');
    expect(m.estadisticas.evidenciasFotograficas.valor).toBe('4');
    expect(m.estadisticas.evidenciasFotograficas.delta).toBeCloseTo(1); // (4-2)/2
  });

  it('no descarga el periodo anterior: reportes, agregados vacíos y medios, más seis conteos', async () => {
    encolar([], []);

    await obtenerMetricasFirestore(periodo);

    expect(getDocsMock).toHaveBeenCalledTimes(3);
    expect(getAggregateMock).toHaveBeenCalledTimes(6);
  });

  it('con `conMedios: false` no lee los medios y deja sus gráficas vacías', async () => {
    // Sólo la lectura de reportes y la de agregados (vacía): el fallback directo no pide
    // medios cuando la pantalla no los usa.
    getDocsMock
      .mockResolvedValueOnce(snap([reporte({ resumenMedios: { fotos: 2, audios: 0 } })]))
      .mockResolvedValueOnce(snap([]));
    encolarConteos({ fotosA: 2 });

    const m = await obtenerMetricasFirestore(periodo, { conMedios: false });

    expect(getDocsMock).toHaveBeenCalledTimes(2);
    expect(m.cobertura.mediosRecortados).toBe(false);
    expect(m.graficas.capturasPorHora.every((p) => p.valor === 0)).toBe(true);
    expect(m.graficas.gbAcumulados).toEqual([]);
    // Las tarjetas salen de los conteos del servidor.
    expect(m.estadisticas.evidenciasFotograficas.valor).toBe('2');
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
    );

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.graficas.descartesPorMotivo).toEqual(
      expect.arrayContaining([
        { categoria: 'Ruta modificada', valor: 2 },
        { categoria: 'Sin motivo registrado', valor: 1 },
      ]),
    );
  });

  it('cubetea capturas por hora (MX) y acumula GB por día desde los medios', async () => {
    encolar(
      [],
      [
        // 15:30 UTC = 09:30 en America/Mexico_City (UTC-6) -> cubeta 09h.
        medio({ fechaLocal: '2026-09-10', sizeBytes: 1024 * 1024 * 1024 }),
        medio({ fechaLocal: '2026-09-11', sizeBytes: 1024 * 1024 * 1024 }),
      ],
    );

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.graficas.capturasPorHora.find((p) => p.etiqueta === '09h')?.valor).toBe(2);
    expect(m.graficas.gbAcumulados).toEqual([
      { etiqueta: '09-10', valor: 1 },
      { etiqueta: '09-11', valor: 2 },
    ]);
  });

  it('agrupa por custodio: viajes, fotos y audios salen de los reportes del dueño', async () => {
    encolar(
      [
        reporte({ __id: 'v1', custodioUid: 'c1', resumenMedios: { fotos: 1, audios: 1 } }),
        reporte({ __id: 'v2', custodioUid: 'c1' }),
        reporte({ __id: 'v3', custodioUid: 'c2', resumenMedios: { fotos: 1, audios: 0 } }),
      ],
      [],
    );

    const m = await obtenerMetricasFirestore(periodo);
    const c1 = m.porCustodio.find((c) => c.uid === 'c1');
    const c2 = m.porCustodio.find((c) => c.uid === 'c2');

    expect(c1).toEqual({ uid: 'c1', nombre: 'Custodio c1', viajes: 2, fotos: 1, audios: 1 });
    expect(c2).toEqual({ uid: 'c2', nombre: 'Custodio c2', viajes: 1, fotos: 1, audios: 0 });
  });

  it('agrupa por viaje: un renglón por reporte, con conteos y el dueño como custodio', async () => {
    encolar(
      [
        reporte({
          __id: 'v1',
          custodioUid: 'c1',
          placas: 'ABC-123',
          ciclo: 'CERRADO',
          hayNovedad: true,
          resumenMedios: { fotos: 2, audios: 1 },
        }),
      ],
      [],
    );

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.porViaje).toEqual([
      {
        id: 'v1',
        placas: 'ABC-123',
        custodios: ['Custodio c1'],
        fechaLocal: '2026-09-10',
        fotos: 2,
        audios: 1,
        ciclo: 'CERRADO',
        hayNovedad: true,
        shipmentId: null,
      },
    ]);
  });

  it('un viaje ACTIVO reporta lo subido como fotos y no separa audios', async () => {
    encolar(
      [
        reporte({
          __id: 'v1',
          custodioUid: 'c1',
          ciclo: 'ACTIVO',
          mediosSubidos: 6,
          // El resumen de un viaje abierto queda en cero aunque ya haya evidencia.
          resumenMedios: { fotos: 0, audios: 0 },
        }),
      ],
      [],
    );

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.porViaje[0]).toMatchObject({ ciclo: 'ACTIVO', fotos: 6, audios: 0 });
    expect(m.porCustodio[0]).toMatchObject({ uid: 'c1', fotos: 6, audios: 0 });
  });

  it('un reporte sin custodio no genera fila de custodio y deja la lista de custodios vacía', async () => {
    encolar([reporte({ __id: 'v1', custodioUid: '' })], []);

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.porCustodio).toEqual([]);
    expect(m.porViaje[0]?.custodios).toEqual([]);
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
    );

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.porUnidad).toEqual([
      { placas: 'ABC-123', viajes: 2 },
      { placas: 'XYZ-789', viajes: 1 },
    ]);
  });
});

describe('obtenerMetricasFirestore (tope de lectura)', () => {
  const reportes5001 = () =>
    // Firestore entrega de lo más reciente a lo más antiguo: el índice 0 es el más nuevo y
    // el 5000 (el documento de verificación, el +1) es el más antiguo.
    Array.from({ length: 5001 }, (_, i) =>
      reporte({ __id: `r-${i}`, fechaLocal: `f${String(5000 - i).padStart(5, '0')}` }),
    );

  it('si los reportes rebasan el tope descarta los más antiguos, conserva el orden ascendente y lo declara', async () => {
    const advertencia = vi.spyOn(console, 'warn').mockImplementation(() => {});
    encolar(reportes5001(), []);

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.porViaje).toHaveLength(5000);
    // Se perdió el más antiguo (f00000) y el resultado vuelve a ir de antiguo a reciente.
    expect(m.porViaje.map((v) => v.fechaLocal)).not.toContain('f00000');
    expect(m.porViaje[0]?.fechaLocal).toBe('f00001');
    expect(m.porViaje.at(-1)?.fechaLocal).toBe('f05000');
    expect(advertencia).toHaveBeenCalledWith(expect.stringContaining('más recientes'));
    expect(m.cobertura).toEqual({ reportesRecortados: true, mediosRecortados: false });
    advertencia.mockRestore();
  });

  it('si los medios rebasan el tope lo declara aparte: los totales siguen completos', async () => {
    const advertencia = vi.spyOn(console, 'warn').mockImplementation(() => {});
    encolar(
      [reporte({ __id: 'v1', resumenMedios: { fotos: 3, audios: 0 } })],
      Array.from({ length: 5001 }, () => medio()),
    );
    encolarConteos({ fotosA: 3 });

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.cobertura).toEqual({ reportesRecortados: false, mediosRecortados: true });
    // Las tarjetas salen de conteos del servidor: quedan completas aunque los medios se
    // recorten.
    expect(m.estadisticas.evidenciasFotograficas.valor).toBe('3');
    // Las gráficas sí cubren sólo los 5000 más recientes.
    expect(m.graficas.capturasPorHora.reduce((suma, p) => suma + p.valor, 0)).toBe(5000);
    advertencia.mockRestore();
  });

  it('con lecturas completas la cobertura no marca recortes', async () => {
    encolar([reporte()], [medio()]);

    const m = await obtenerMetricasFirestore(periodo);

    expect(m.cobertura).toEqual({ reportesRecortados: false, mediosRecortados: false });
  });
});

describe('obtenerMetricasFirestore (métricas preagregadas, P2)', () => {
  function agregadoDiario(fecha: string, extra: Record<string, unknown> = {}) {
    return {
      fecha,
      clienteId: 'Colgate',
      totales: { bytes: 0 },
      porCustodio: {},
      porUnidad: {},
      porEnvio: {},
      descartesPorMotivo: {},
      capturasPorHora: {},
      ...extra,
    };
  }

  it('deriva rankings y gráficas de los agregados sin leer los documentos del periodo', async () => {
    encolar(
      [],
      [],
      [
        agregadoDiario('2026-09-01', {
          totales: { bytes: 1024 * 1024 * 1024 },
          porCustodio: { c1: { reportes: 2, fotos: 3, audios: 1 } },
          porUnidad: { 'ABC-123': { reportes: 2 } },
          descartesPorMotivo: { 'Ruta modificada': { reportes: 2 } },
          capturasPorHora: { 9: 5 },
        }),
        agregadoDiario('2026-09-02', {
          totales: { bytes: 1024 * 1024 * 1024 },
        }),
      ],
    );

    const m = await obtenerMetricasFirestore(periodo);

    // Sin reportes del periodo y sin día actual en el rango: solo dos lecturas.
    expect(getDocsMock).toHaveBeenCalledTimes(2);
    expect(m.porCustodio).toEqual([
      { uid: 'c1', nombre: 'Custodio c1', viajes: 2, fotos: 3, audios: 1 },
    ]);
    expect(m.porUnidad).toEqual([{ placas: 'ABC-123', viajes: 2 }]);
    expect(m.graficas.descartesPorMotivo).toEqual([{ categoria: 'Ruta modificada', valor: 2 }]);
    expect(m.graficas.capturasPorHora.find((p) => p.etiqueta === '09h')?.valor).toBe(5);
    expect(m.graficas.gbAcumulados).toEqual([
      { etiqueta: '09-01', valor: 1 },
      { etiqueta: '09-02', valor: 2 },
    ]);
    expect(m.cobertura).toEqual({ reportesRecortados: false, mediosRecortados: false });
  });

  it('suma el día actual a los agregados cuando el rango incluye hoy', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T18:00:00Z')); // hoy en México: 2026-09-02
    const rangoConHoy = { desde: '2026-09-01', hasta: '2026-09-02' };

    getDocsMock
      .mockResolvedValueOnce(
        snap([
          reporte({
            __id: 'hoy',
            custodioUid: 'c-hoy',
            fechaLocal: '2026-09-02',
            resumenMedios: { fotos: 2, audios: 0 },
          }),
        ]),
      )
      .mockResolvedValueOnce(
        snap([
          agregadoDiario('2026-09-01', {
            porCustodio: { 'c-viejo': { reportes: 1, fotos: 1, audios: 0 } },
            capturasPorHora: { 9: 3 },
          }),
        ]),
      )
      .mockResolvedValueOnce(
        snap([
          medio({
            tipo: 'FOTO',
            sizeBytes: 1024,
            createdAtDevice: { toDate: () => new Date('2026-09-02T15:30:00Z') },
          }),
        ]),
      );

    const m = await obtenerMetricasFirestore(rangoConHoy);
    vi.useRealTimers();

    expect(m.porCustodio.map((c) => c.uid).sort()).toEqual(['c-hoy', 'c-viejo']);
    // 3 capturas del agregado + 1 del día actual, en la misma hora 09.
    expect(m.graficas.capturasPorHora.find((p) => p.etiqueta === '09h')?.valor).toBe(4);
    // El día actual aporta su reporte al registro por seguimiento.
    expect(m.porViaje).toHaveLength(1);
  });
});
