import { describe, expect, it, vi } from 'vitest';

// El módulo importa el SDK de Firestore y la sesión. Las funciones puras de la matriz no
// los usan, así que los mocks sólo evitan cargar el cliente real.
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn() }));
vi.mock('@/lib/firebase/cliente', () => ({ firestore: {} }));
vi.mock('./sesion', () => ({ esperarSesion: vi.fn() }));

import {
  RUTA_INICIAL,
  perfilDesdeDocumento,
  puedeAcceder,
  seccionesDe,
  type PerfilPanel,
} from './accesoPanel';

const analista: PerfilPanel = { rol: 'ANALISTA', clienteId: null };
const cliente: PerfilPanel = { rol: 'CLIENTE', clienteId: 'Colgate' };
const checklist: PerfilPanel = { rol: 'CHECKLIST', clienteId: null };

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
    expect(seccionesDe(checklist)).toEqual(['/envios']);
  });

  it('cada rol inicia en su primera sección', () => {
    expect(RUTA_INICIAL).toEqual({
      ANALISTA: '/viajes',
      CLIENTE: '/viajes',
      CHECKLIST: '/envios',
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
    expect(perfilDesdeDocumento({ rol: 'ANALISTA' })).toEqual({
      rol: 'ANALISTA',
      clienteId: null,
    });
    expect(perfilDesdeDocumento({ rol: 'CLIENTE', clienteId: 'Colgate' })).toEqual({
      rol: 'CLIENTE',
      clienteId: 'Colgate',
    });
    expect(perfilDesdeDocumento({ rol: 'CHECKLIST' })).toEqual({
      rol: 'CHECKLIST',
      clienteId: null,
    });
  });

  it('exige empresa al Cliente', () => {
    expect(perfilDesdeDocumento({ rol: 'CLIENTE' })).toBeNull();
    expect(perfilDesdeDocumento({ rol: 'CLIENTE', clienteId: '   ' })).toBeNull();
    expect(perfilDesdeDocumento({ rol: 'CLIENTE', clienteId: 42 })).toBeNull();
  });

  it('rechaza un rol desconocido y un documento vacío', () => {
    expect(perfilDesdeDocumento({ rol: 'SUPERVISOR', clienteId: 'Colgate' })).toBeNull();
    expect(perfilDesdeDocumento({})).toBeNull();
    expect(perfilDesdeDocumento(undefined)).toBeNull();
  });

  it('ignora la empresa de los roles internos', () => {
    expect(perfilDesdeDocumento({ rol: 'ANALISTA', clienteId: 'Colgate' })).toEqual({
      rol: 'ANALISTA',
      clienteId: null,
    });
  });
});
