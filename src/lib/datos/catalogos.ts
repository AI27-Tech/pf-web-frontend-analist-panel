/**
 * SOLO DESARROLLO: `usarMock` se borra junto con `VITE_USAR_EMULADORES` y
 * `VITE_SALTAR_LOGIN` cuando la fase F1 (rol del analista) cierre.
 */

import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';

import { firestore } from '@/lib/firebase/cliente';

import { listarEtiquetasMock } from './catalogosMock';
import type { Etiqueta } from './tipos';

const usarMock = import.meta.env.VITE_DATOS_MOCK === 'true';

function aEtiqueta(id: string, d: DocumentData): Etiqueta {
  return {
    id,
    nombre: d.nombre ?? '',
    orden: d.orden ?? 0,
    activo: d.activo === true,
  };
}

/**
 * Nombre de colección PROVISIONAL: `docs/PLAN.md` no define todavía dónde vive el
 * catálogo de etiquetas (§13.1, "pendiente de definición por Operación"). Se usa
 * `'catalogos_etiquetas'` como nombre de trabajo; ajustar aquí cuando Operación lo
 * confirme.
 */
async function listarEtiquetasFirestore(): Promise<Etiqueta[]> {
  const resultado = await getDocs(
    query(
      collection(firestore, 'catalogos_etiquetas'),
      where('activo', '==', true),
      orderBy('orden', 'asc'),
    ),
  );
  return resultado.docs.map((documento) => aEtiqueta(documento.id, documento.data()));
}

export function listarEtiquetas(): Promise<Etiqueta[]> {
  return usarMock ? listarEtiquetasMock() : listarEtiquetasFirestore();
}
