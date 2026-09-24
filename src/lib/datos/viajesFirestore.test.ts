import { describe, expect, it, vi } from 'vitest';

// El módulo importa el SDK de Firestore y el cliente; se mockean para poder importar la
// función pura `conteoDeMedios` sin una conexión real. `conteoDeMedios` no usa nada del
// SDK, así que los mocks sólo evitan la carga del cliente.
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));
vi.mock('@/lib/firebase/cliente', () => ({ firestore: {} }));
vi.mock('./custodios', () => ({ enriquecerConNombres: vi.fn() }));

import { conteoDeMedios } from './viajesFirestore';

describe('conteoDeMedios (resumenMedios como snapshot de cierre)', () => {
  it('viaje ACTIVO: reporta mediosSubidos como fotos, ignorando el resumen en cero', () => {
    const doc = { ciclo: 'ACTIVO', mediosSubidos: 6, resumenMedios: { fotos: 0, audios: 0 } };

    expect(conteoDeMedios(doc)).toEqual({ fotos: 6, audios: 0 });
  });

  it('viaje CERRADO: respeta el desglose de resumenMedios', () => {
    const doc = {
      ciclo: 'CERRADO',
      mediosSubidos: 3,
      resumenMedios: { fotos: 2, audios: 1, durationMsTotal: 60000 },
    };

    expect(conteoDeMedios(doc)).toEqual({ fotos: 2, audios: 1 });
  });

  it('viaje DESCARTADO: también usa resumenMedios (no es ACTIVO)', () => {
    const doc = { ciclo: 'DESCARTADO', mediosSubidos: 5, resumenMedios: { fotos: 4, audios: 0 } };

    expect(conteoDeMedios(doc)).toEqual({ fotos: 4, audios: 0 });
  });

  it('documento sin ciclo se trata como ACTIVO (fotos = mediosSubidos)', () => {
    expect(conteoDeMedios({ mediosSubidos: 2 })).toEqual({ fotos: 2, audios: 0 });
  });

  it('ACTIVO sin mediosSubidos cae a cero', () => {
    expect(conteoDeMedios({ ciclo: 'ACTIVO' })).toEqual({ fotos: 0, audios: 0 });
  });

  it('CERRADO sin resumenMedios cae a cero', () => {
    expect(conteoDeMedios({ ciclo: 'CERRADO', mediosSubidos: 3 })).toEqual({ fotos: 0, audios: 0 });
  });
});
