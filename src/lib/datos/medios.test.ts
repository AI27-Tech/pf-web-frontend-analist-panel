import { beforeEach, describe, expect, it, vi } from 'vitest';

// Captura de las llamadas a `where` para verificar que la etiqueta se filtra por
// pertenencia (`array-contains`) y no por igualdad, y stubs de `getDocs` para probar el
// mapper contra un documento con la forma real del contrato.
const whereMock = vi.fn((campo: string, op: string, valor: unknown) => ({ campo, op, valor }));
const getDocsMock = vi.fn();
const orderByMock = vi.fn((campo: string, dir: string) => ({ campo, dir }));
const startAfterMock = vi.fn((cursor: unknown) => ({ cursor }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  limit: vi.fn(() => ({})),
  orderBy: (campo: string, dir: string) => orderByMock(campo, dir),
  query: vi.fn((_col: unknown, ...constraints: unknown[]) => ({ constraints })),
  startAfter: (cursor: unknown) => startAfterMock(cursor),
  where: (campo: string, op: string, valor: unknown) => whereMock(campo, op, valor),
}));
vi.mock('firebase/storage', () => ({ getDownloadURL: vi.fn(), ref: vi.fn() }));
vi.mock('@/lib/firebase/cliente', () => ({ firestore: {}, storage: {} }));
// El directorio de custodios lee `usuarios/{uid}`.
vi.mock('./custodios', () => ({
  enriquecerMediosConNombres: vi.fn((medios: unknown[]) => Promise.resolve([...medios])),
}));

import { listarMedios, listarMediosDeCustodioEnPeriodo, listarMediosDelViaje } from './medios';

/** Documento con la forma real de `medios` (pf-app-custodio §5.1), con `etiquetas` array. */
function docReal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm-1',
    data: () => ({
      reporteId: 'r-1',
      tipo: 'FOTO',
      etiquetas: ['sin-novedad'],
      storagePath: 'medios/r-1/m-1.jpg',
      thumbnailPath: 'medios/r-1/m-1-min.jpg',
      createdAtDevice: { toDate: () => new Date('2026-09-23T22:20:01Z') },
      createdAtServer: { toDate: () => new Date('2026-09-23T22:20:10Z') },
      gps: { lat: 19.4295154, lng: -99.2059598, accuracyM: 13.24, ageMs: 1444 },
      sizeBytes: 691998,
      placas: '123ABC',
      custodioUid: 'u-1',
      fechaLocal: '2026-09-23',
      ...overrides,
    }),
  };
}

beforeEach(() => {
  whereMock.mockClear();
  startAfterMock.mockClear();
  orderByMock.mockClear();
  getDocsMock.mockReset();
});

describe('aMedio (mapper)', () => {
  it('mapea `etiquetas` como array desde el documento real', async () => {
    getDocsMock.mockResolvedValue({ docs: [docReal()] });

    const [medio] = await listarMediosDelViaje('r-1');

    expect(medio?.etiquetas).toEqual(['sin-novedad']);
  });

  it('cae a array vacío cuando el documento no trae `etiquetas`', async () => {
    getDocsMock.mockResolvedValue({ docs: [docReal({ etiquetas: undefined })] });

    const [medio] = await listarMediosDelViaje('r-1');

    expect(medio?.etiquetas).toEqual([]);
  });
});

describe('listarMedios (filtro de etiqueta)', () => {
  it('filtra la etiqueta con `array-contains`, no con igualdad', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });

    await listarMedios({ desde: '2026-09-01', hasta: '2026-09-30', etiqueta: 'sin-novedad' });

    const llamadaEtiqueta = whereMock.mock.calls.find(([campo]) => campo === 'etiquetas');
    expect(llamadaEtiqueta).toEqual(['etiquetas', 'array-contains', 'sin-novedad']);
  });
});

describe('listarMedios (galería)', () => {
  /** `n` documentos con ids `<prefijo>-0 … <prefijo>-(n-1)`. */
  const documentos = (n: number, prefijo: string) =>
    Array.from({ length: n }, (_, i) => ({ ...docReal(), id: `${prefijo}-${i}` }));

  it('sin número económico acota por rango de fechaLocal en el servidor', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });

    await listarMedios({ desde: '2026-09-01', hasta: '2026-09-30' });

    expect(whereMock.mock.calls).toEqual([
      ['fechaLocal', '>=', '2026-09-01'],
      ['fechaLocal', '<=', '2026-09-30'],
    ]);
  });

  it('con número económico consulta sólo `placas ==` (sin rango: evita el índice compuesto)', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });

    await listarMedios({ desde: '2026-09-01', hasta: '2026-09-30', placas: '807Y453REAL' });

    expect(whereMock.mock.calls).toEqual([['placas', '==', '807Y453REAL']]);
    expect(orderByMock).not.toHaveBeenCalled();
  });

  it('con número económico aplica el período sobre lo leído', async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        { ...docReal({ fechaLocal: '2026-08-31' }), id: 'antes' },
        { ...docReal({ fechaLocal: '2026-09-15' }), id: 'dentro' },
        { ...docReal({ fechaLocal: '2026-10-01' }), id: 'despues' },
      ],
    });

    const { medios } = await listarMedios({
      desde: '2026-09-01',
      hasta: '2026-09-30',
      placas: '807Y453REAL',
    });

    expect(medios.map((m) => m.id)).toEqual(['dentro']);
  });

  it('con período «Todos» (extremos vacíos) no pone filtros de fecha', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });

    await listarMedios({ desde: '', hasta: '' });

    expect(whereMock).not.toHaveBeenCalled();
  });

  it('ordena por un solo campo (fechaLocal ↓): no exige índice compuesto', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });

    await listarMedios({ desde: '', hasta: '' });

    expect(orderByMock.mock.calls).toEqual([['fechaLocal', 'desc']]);
  });

  it('lee por páginas hasta agotarlas: no se queda en las primeras 120', async () => {
    const primera = documentos(500, 'a');
    getDocsMock
      .mockResolvedValueOnce({ docs: primera })
      .mockResolvedValueOnce({ docs: documentos(300, 'b') });

    const { medios, recortado } = await listarMedios({ desde: '', hasta: '' });

    expect(medios).toHaveLength(800);
    expect(recortado).toBe(false);
    expect(startAfterMock).toHaveBeenCalledWith(primera[499]);
  });

  it('si rebasa el tope, devuelve el tope y marca recorte', async () => {
    getDocsMock
      .mockResolvedValueOnce({ docs: documentos(500, 'a') })
      .mockResolvedValueOnce({ docs: documentos(1, 'extra') });

    const { medios, recortado } = await listarMedios({ desde: '', hasta: '', limite: 500 });

    expect(recortado).toBe(true);
    expect(medios).toHaveLength(500);
    expect(medios.some((m) => m.id === 'extra-0')).toBe(false);
  });

  it('con exactamente el tope de archivos no marca recorte', async () => {
    getDocsMock
      .mockResolvedValueOnce({ docs: documentos(500, 'a') })
      .mockResolvedValueOnce({ docs: [] });

    const { medios, recortado } = await listarMedios({ desde: '', hasta: '', limite: 500 });

    expect(medios).toHaveLength(500);
    expect(recortado).toBe(false);
  });

  it('devuelve lo más reciente primero, aunque la consulta lea cada día de forma ascendente', async () => {
    const captura = (iso: string) => ({ toDate: () => new Date(iso) });
    getDocsMock.mockResolvedValue({
      docs: [
        { ...docReal({ createdAtDevice: captura('2026-09-23T10:00:00Z') }), id: 'temprano' },
        { ...docReal({ createdAtDevice: captura('2026-09-23T20:00:00Z') }), id: 'tarde' },
      ],
    });

    const { medios } = await listarMedios({ desde: '', hasta: '' });

    expect(medios.map((m) => m.id)).toEqual(['tarde', 'temprano']);
  });
});

describe('listarMediosDeCustodioEnPeriodo', () => {
  const periodo = { desde: '2026-09-01', hasta: '2026-09-30' };

  /** `n` documentos con ids `<prefijo>-0 … <prefijo>-(n-1)`. */
  const documentos = (n: number, prefijo: string) =>
    Array.from({ length: n }, (_, i) => ({ ...docReal(), id: `${prefijo}-${i}` }));

  it('filtra por unidad y rango en el servidor, no en memoria', async () => {
    getDocsMock.mockResolvedValue({ docs: [{ ...docReal(), id: 'm-1' }] });

    const { medios, recortado } = await listarMediosDeCustodioEnPeriodo(periodo, 'u-1');

    expect(medios.map((m) => m.id)).toEqual(['m-1']);
    expect(recortado).toBe(false);
    expect(whereMock.mock.calls).toEqual([
      ['custodioUid', '==', 'u-1'],
      ['fechaLocal', '>=', '2026-09-01'],
      ['fechaLocal', '<=', '2026-09-30'],
    ]);
  });

  it('ordena igual que el índice (fechaLocal ↑, createdAtDevice ↓), no al revés', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });

    await listarMediosDeCustodioEnPeriodo(periodo, 'u-1');

    expect(orderByMock.mock.calls).toEqual([
      ['fechaLocal', 'asc'],
      ['createdAtDevice', 'desc'],
    ]);
  });

  it('lee por páginas hasta agotarlas y junta todo el periodo', async () => {
    const primera = documentos(500, 'a');
    getDocsMock
      .mockResolvedValueOnce({ docs: primera })
      .mockResolvedValueOnce({ docs: documentos(120, 'b') });

    const { medios, recortado } = await listarMediosDeCustodioEnPeriodo(periodo, 'u-1');

    expect(medios).toHaveLength(620);
    expect(recortado).toBe(false);
    expect(getDocsMock).toHaveBeenCalledTimes(2);
    // La segunda página arranca después del último documento de la primera.
    expect(startAfterMock).toHaveBeenCalledTimes(1);
    expect(startAfterMock).toHaveBeenCalledWith(primera[499]);
  });

  it('con exactamente el tope de archivos no marca recorte', async () => {
    // 10 páginas de 500 = 5000; la lectura de verificación (1 documento) vuelve vacía.
    for (let i = 0; i < 10; i++) {
      getDocsMock.mockResolvedValueOnce({ docs: documentos(500, `p${i}`) });
    }
    getDocsMock.mockResolvedValueOnce({ docs: [] });

    const { medios, recortado } = await listarMediosDeCustodioEnPeriodo(periodo, 'u-1');

    expect(medios).toHaveLength(5000);
    expect(recortado).toBe(false);
  });

  it('si rebasa el tope, conserva los primeros 5000 (los más antiguos) y marca recorte', async () => {
    for (let i = 0; i < 10; i++) {
      getDocsMock.mockResolvedValueOnce({ docs: documentos(500, `p${i}`) });
    }
    getDocsMock.mockResolvedValueOnce({ docs: documentos(1, 'extra') });

    const { medios, recortado } = await listarMediosDeCustodioEnPeriodo(periodo, 'u-1');

    expect(recortado).toBe(true);
    expect(medios).toHaveLength(5000);
    expect(medios.some((m) => m.id === 'extra-0')).toBe(false);
    // Nunca pide más de lo necesario: 10 páginas + 1 documento de verificación.
    expect(getDocsMock).toHaveBeenCalledTimes(11);
  });

  it('sin archivos devuelve lista vacía tras una sola lectura', async () => {
    getDocsMock.mockResolvedValue({ docs: [] });

    const r = await listarMediosDeCustodioEnPeriodo(periodo, 'u-1');

    expect(r).toEqual({ medios: [], recortado: false });
    expect(getDocsMock).toHaveBeenCalledTimes(1);
  });
});
