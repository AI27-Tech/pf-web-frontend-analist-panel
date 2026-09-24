import { beforeEach, describe, expect, it, vi } from 'vitest';

// Captura de las llamadas a `where` para verificar que la etiqueta se filtra por
// pertenencia (`array-contains`) y no por igualdad, y stubs de `getDocs` para probar el
// mapper contra un documento con la forma real del contrato.
const whereMock = vi.fn((campo: string, op: string, valor: unknown) => ({ campo, op, valor }));
const getDocsMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  limit: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  query: vi.fn((_col: unknown, ...constraints: unknown[]) => ({ constraints })),
  where: (campo: string, op: string, valor: unknown) => whereMock(campo, op, valor),
}));
vi.mock('firebase/storage', () => ({ getDownloadURL: vi.fn(), ref: vi.fn() }));
vi.mock('@/lib/firebase/cliente', () => ({ firestore: {}, storage: {} }));

import { listarMedios, listarMediosDelViaje } from './medios';

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
