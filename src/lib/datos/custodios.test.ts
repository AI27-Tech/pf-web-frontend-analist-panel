import { beforeEach, describe, expect, it, vi } from 'vitest';

// El módulo importa el SDK de Firestore y el cliente. Se mockean ambos para probar la
// lógica de resolución de nombres sin una conexión real.
const getDocMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  // `doc` sólo necesita devolver algo que `getDoc` reciba; se codifica el uid en la ref
  // para que el mock de `getDoc` sepa a qué documento responde.
  doc: (_firestore: unknown, _coleccion: string, uid: string) => ({ uid }),
  getDoc: (ref: { uid: string }) => getDocMock(ref),
}));

vi.mock('@/lib/firebase/cliente', () => ({ firestore: {} }));

import { enriquecerConNombres, obtenerCustodios } from './custodios';
import type { Viaje } from './tipos';

/** Entrada mínima de enriquecimiento, tipada para que `custodioName` sea una propiedad
 *  conocida (opcional) en las aserciones. */
type EntradaViaje = Pick<Viaje, 'custodioUid' | 'custodioName'>;

/** Fabrica una respuesta de `getDoc` para un documento presente o ausente. */
function docConNombre(nombre: string | undefined, telefono?: string) {
  return {
    exists: () => true,
    data: () => ({ nombre, telefono }),
  };
}
const docAusente = { exists: () => false, data: () => ({}) };

beforeEach(() => {
  getDocMock.mockReset();
});

describe('obtenerCustodios', () => {
  it('mapea nombre y teléfono de los documentos presentes', async () => {
    getDocMock.mockImplementation((ref: { uid: string }) =>
      Promise.resolve(ref.uid === 'u1' ? docConNombre('Ana Ruiz', '+525500000001') : docAusente),
    );

    const mapa = await obtenerCustodios(['u1', 'u2']);

    expect(mapa.get('u1')).toEqual({ uid: 'u1', nombre: 'Ana Ruiz', telefono: '+525500000001' });
    // u2 no existe: no aparece en el mapa.
    expect(mapa.has('u2')).toBe(false);
  });

  it('deduplica uids y ignora los vacíos', async () => {
    getDocMock.mockResolvedValue(docConNombre('Repetido'));

    await obtenerCustodios(['u1', 'u1', '', 'u1']);

    // Sólo un uid único no vacío -> una sola lectura.
    expect(getDocMock).toHaveBeenCalledTimes(1);
  });

  it('un documento sin nombre queda sin nombre (no cadena vacía)', async () => {
    getDocMock.mockResolvedValue(docConNombre(undefined, '+525500000002'));

    const mapa = await obtenerCustodios(['u1']);

    expect(mapa.get('u1')?.nombre).toBeUndefined();
    expect(mapa.get('u1')?.telefono).toBe('+525500000002');
  });

  it('un fallo de lectura de un custodio no tumba al resto', async () => {
    getDocMock.mockImplementation((ref: { uid: string }) =>
      ref.uid === 'malo'
        ? Promise.reject(new Error('permission-denied'))
        : Promise.resolve(docConNombre('Ok')),
    );

    const mapa = await obtenerCustodios(['malo', 'bueno']);

    expect(mapa.has('malo')).toBe(false);
    expect(mapa.get('bueno')?.nombre).toBe('Ok');
  });
});

describe('enriquecerConNombres', () => {
  it('pone custodioName cuando el directorio lo conoce', async () => {
    getDocMock.mockResolvedValue(docConNombre('Ana Ruiz'));

    const [viaje] = await enriquecerConNombres<EntradaViaje>([{ custodioUid: 'u1' }]);

    expect(viaje?.custodioName).toBe('Ana Ruiz');
  });

  it('deja el viaje sin custodioName cuando el custodio no existe (la UI cae al teléfono)', async () => {
    getDocMock.mockResolvedValue(docAusente);

    const [viaje] = await enriquecerConNombres<EntradaViaje>([{ custodioUid: 'desconocido' }]);

    expect(viaje?.custodioName).toBeUndefined();
  });

  it('no muta el arreglo de entrada', async () => {
    getDocMock.mockResolvedValue(docConNombre('Ana Ruiz'));
    const entrada = [{ custodioUid: 'u1' }];

    await enriquecerConNombres(entrada);

    expect(entrada[0]).not.toHaveProperty('custodioName');
  });
});
