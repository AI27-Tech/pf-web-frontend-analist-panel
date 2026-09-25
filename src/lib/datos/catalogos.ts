/**
 * SOLO DESARROLLO: `usarMock` se borra junto con `VITE_USAR_EMULADORES` y
 * `VITE_DATOS_MOCK` cuando la fase F1 (rol del analista) cierre.
 */

import { doc, getDoc, type DocumentData } from 'firebase/firestore';

import { firestore } from '@/lib/firebase/cliente';

import { listarEtiquetasMock } from './catalogosMock';
import type { CategoriaEtiqueta, Etiqueta } from './tipos';

const usarMock = import.meta.env.VITE_DATOS_MOCK === 'true';

/** Categorías válidas del catálogo (pf-app-custodio §5.1). */
const CATEGORIAS: readonly CategoriaEtiqueta[] = ['SITUACION', 'EVIDENCIA'];

function aCategoria(valor: unknown): CategoriaEtiqueta | undefined {
  return typeof valor === 'string' && (CATEGORIAS as readonly string[]).includes(valor)
    ? (valor as CategoriaEtiqueta)
    : undefined;
}

/** Traduce una entrada del array `valores` a una `Etiqueta` del panel. Devuelve `null`
 *  si la entrada no tiene forma de etiqueta (sin `id` o sin `nombre` usables). */
function aEtiqueta(v: DocumentData): Etiqueta | null {
  const id = typeof v.id === 'string' ? v.id : '';
  const nombre = typeof v.nombre === 'string' ? v.nombre : '';
  if (id === '' || nombre === '') return null;
  const categoria = aCategoria(v.categoria);
  return {
    id,
    nombre,
    ...(categoria ? { categoria } : {}),
    orden: typeof v.orden === 'number' ? v.orden : 0,
    activo: v.activo === true,
  };
}

/**
 * Mapea el array `valores` del documento a etiquetas activas, ordenadas.
 *
 * Es pura y exportada para poder probarla sin Firestore. Descarta entradas malformadas,
 * se queda con las activas y ordena por `orden` ascendente (con el `id` de desempate para
 * un orden estable cuando `orden` empata).
 */
export function mapearValores(valores: unknown): Etiqueta[] {
  if (!Array.isArray(valores)) return [];
  return valores
    .map((v) => (v && typeof v === 'object' ? aEtiqueta(v as DocumentData) : null))
    .filter((e): e is Etiqueta => e !== null && e.activo)
    .sort((a, b) => (a.orden !== b.orden ? a.orden - b.orden : a.id.localeCompare(b.id, 'es')));
}

/**
 * Lee el catálogo de etiquetas del documento ÚNICO `catalogos/etiquetas`.
 *
 * El contrato del productor no es una colección: es un solo documento con un array
 * `valores` (`[{ id, nombre, categoria, orden, activo }]`, pf-app-custodio §5.1). Si el
 * documento no existe o está malformado, se devuelve una lista vacía: el filtro de
 * etiqueta simplemente no ofrece opciones, en lugar de romper la pantalla.
 */
async function listarEtiquetasFirestore(): Promise<Etiqueta[]> {
  const documento = await getDoc(doc(firestore, 'catalogos', 'etiquetas'));
  if (!documento.exists()) return [];
  return mapearValores(documento.data().valores);
}

export function listarEtiquetas(): Promise<Etiqueta[]> {
  return usarMock ? listarEtiquetasMock() : listarEtiquetasFirestore();
}
