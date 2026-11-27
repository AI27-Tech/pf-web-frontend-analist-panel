import { describe, expect, it, vi } from 'vitest';

// El módulo importa el SDK de Firestore y la sesión. Las funciones puras de la matriz no
// los usan, así que los mocks sólo evitan cargar el cliente real.
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), onSnapshot: vi.fn() }));
vi.mock('@/lib/firebase/cliente', () => ({ firestore: {} }));
vi.mock('./sesion', () => ({ esperarSesion: vi.fn() }));

import {
  RUTA_INICIAL,
  perfilDesdeDocumento,
  puedeAcceder,
  seccionesDe,
  type PerfilPanel,
} from './accesoPanel';

const analista: PerfilPanel = { rol: 'analista', clienteId: null };
const cliente: PerfilPanel = { rol: 'cliente', clienteId: 'Colgate' };
const checklist: PerfilPanel = { rol: 'checklist', clienteId: 'Colgate' };

describe('matriz de secciones por rol', () => {
  it('el Analista conserva las seis secciones actuales', () => {
    expect(seccionesDe(analista)).toEqual([
      '/viajes',
      '/galeria',
      '/reporte',
      '/sistema',
      '/administracion',
      '/ajustes',
    ]);
  });

  it('el Cliente sólo ve Seguimientos, Galería, Reporte y Ajustes', () => {
    expect(seccionesDe(cliente)).toEqual(['/viajes', '/galeria', '/reporte', '/ajustes']);
  });

  it('Checklist sólo ve Envíos', () => {
    expect(seccionesDe(checklist)).toEqual(['/envios', '/ajustes']);
  });

  it('cada rol inicia en su primera sección', () => {
    expect(RUTA_INICIAL).toEqual({
      analista: '/viajes',
      cliente: '/viajes',
      checklist: '/envios',
    });
  });
});

describe('puedeAcceder', () => {
  it('permite las subrutas de una sección propia', () => {
    expect(puedeAcceder(cliente, '/viajes/r-1')).toBe(true);
  });

  it('niega secciones de otro rol', () => {
    expect(puedeAcceder(cliente, '/administracion')).toBe(false);
    expect(puedeAcceder(cliente, '/sistema')).toBe(false);
    expect(puedeAcceder(checklist, '/viajes')).toBe(false);
    expect(puedeAcceder(analista, '/envios')).toBe(false);
  });

  it('no confunde una ruta con un prefijo parcial', () => {
    expect(puedeAcceder(cliente, '/viajesx')).toBe(false);
  });
});

describe('perfilDesdeDocumento', () => {
  it('acepta los tres roles', () => {
    expect(perfilDesdeDocumento({ rol: 'analista', activo: true })).toEqual({
      rol: 'analista',
      clienteId: null,
    });
    expect(perfilDesdeDocumento({ rol: 'cliente', clienteId: 'Colgate', activo: true })).toEqual({
      rol: 'cliente',
      clienteId: 'Colgate',
    });
    expect(perfilDesdeDocumento({ rol: 'checklist', clienteId: 'Colgate', activo: true })).toEqual({
      rol: 'checklist',
      clienteId: 'Colgate',
    });
  });

  it('exige empresa al Cliente y al Checklist', () => {
    expect(perfilDesdeDocumento({ rol: 'cliente', activo: true })).toBeNull();
    expect(perfilDesdeDocumento({ rol: 'cliente', clienteId: '   ', activo: true })).toBeNull();
    expect(perfilDesdeDocumento({ rol: 'cliente', clienteId: 42, activo: true })).toBeNull();
    expect(perfilDesdeDocumento({ rol: 'checklist', activo: true })).toBeNull();
  });

  it('conserva el texto exacto de la empresa, sin normalizarlo', () => {
    expect(perfilDesdeDocumento({ rol: 'cliente', clienteId: 'Colgate ', activo: true })).toEqual({
      rol: 'cliente',
      clienteId: 'Colgate ',
    });
  });

  it('exige activo: true; sin el campo o en false no hay acceso', () => {
    expect(perfilDesdeDocumento({ rol: 'analista' })).toBeNull();
    expect(perfilDesdeDocumento({ rol: 'analista', activo: false })).toBeNull();
    expect(
      perfilDesdeDocumento({ rol: 'cliente', clienteId: 'Colgate', activo: false }),
    ).toBeNull();
    expect(perfilDesdeDocumento({ rol: 'analista', activo: 'true' })).toBeNull();
  });

  it('rechaza un rol desconocido y un documento vacío', () => {
    expect(
      perfilDesdeDocumento({ rol: 'SUPERVISOR', clienteId: 'Colgate', activo: true }),
    ).toBeNull();
    expect(perfilDesdeDocumento({ rol: 'ANALISTA', activo: true })).toBeNull();
    expect(perfilDesdeDocumento({})).toBeNull();
    expect(perfilDesdeDocumento(undefined)).toBeNull();
  });

  it('ignora la empresa de los roles internos', () => {
    expect(perfilDesdeDocumento({ rol: 'analista', clienteId: 'Colgate', activo: true })).toEqual({
      rol: 'analista',
      clienteId: null,
    });
  });
});
