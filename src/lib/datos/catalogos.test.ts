import { describe, expect, it, vi } from 'vitest';

// El módulo importa el SDK y el cliente; se mockean para poder importar la función pura
// `mapearValores`. No se ejercita la lectura de Firestore aquí (eso es integración con
// el emulador), sólo el mapeo del array `valores`.
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn() }));
vi.mock('@/lib/firebase/cliente', () => ({ firestore: {} }));

import { mapearValores } from './catalogos';

describe('mapearValores (catalogos/etiquetas.valores)', () => {
  it('mapea la forma real { id, nombre, categoria, orden, activo }', () => {
    const valores = [
      { id: 'sin-novedad', nombre: 'Sin novedad', categoria: 'SITUACION', orden: 2, activo: true },
      { id: 'candado', nombre: 'Candado', categoria: 'EVIDENCIA', orden: 1, activo: true },
    ];

    expect(mapearValores(valores)).toEqual([
      { id: 'candado', nombre: 'Candado', categoria: 'EVIDENCIA', orden: 1, activo: true },
      { id: 'sin-novedad', nombre: 'Sin novedad', categoria: 'SITUACION', orden: 2, activo: true },
    ]);
  });

  it('descarta las inactivas', () => {
    const valores = [
      { id: 'a', nombre: 'A', orden: 1, activo: true },
      { id: 'b', nombre: 'B', orden: 2, activo: false },
    ];

    expect(mapearValores(valores).map((e) => e.id)).toEqual(['a']);
  });

  it('descarta entradas malformadas (sin id o sin nombre)', () => {
    const valores = [
      { id: 'ok', nombre: 'OK', orden: 1, activo: true },
      { id: '', nombre: 'Sin id', orden: 2, activo: true },
      { nombre: 'Sin id tampoco', orden: 3, activo: true },
      { id: 'sin-nombre', orden: 4, activo: true },
      'no-es-objeto',
      null,
    ];

    expect(mapearValores(valores).map((e) => e.id)).toEqual(['ok']);
  });

  it('ignora una categoría fuera del enum (queda sin categoria)', () => {
    const valores = [{ id: 'a', nombre: 'A', categoria: 'OTRA', orden: 1, activo: true }];

    expect(mapearValores(valores)[0]?.categoria).toBeUndefined();
  });

  it('devuelve vacío si valores no es un array (doc malformado)', () => {
    expect(mapearValores(undefined)).toEqual([]);
    expect(mapearValores(null)).toEqual([]);
    expect(mapearValores({})).toEqual([]);
  });
});
