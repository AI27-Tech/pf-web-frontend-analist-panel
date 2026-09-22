/**
 * ESTE ARCHIVO ES DE DESARROLLO. Se borra cuando la lista consuma Firestore.
 *
 * El catálogo real de etiquetas sigue pendiente de definición por Operación
 * (docs/PLAN.md §13.1); por eso las opciones no se declaran en ningún componente y
 * llegan siempre por esta capa de datos.
 */

import type { Etiqueta } from './tipos';

const etiquetasEstaticas: Etiqueta[] = [
  { id: 'salida', nombre: 'Salida', orden: 1, activo: true },
  { id: 'llegada', nombre: 'Llegada', orden: 2, activo: true },
  { id: 'incidencia', nombre: 'Incidencia', orden: 3, activo: true },
  { id: 'documento', nombre: 'Documento', orden: 4, activo: true },
  { id: 'candado', nombre: 'Candado', orden: 5, activo: true },
];

export function listarEtiquetasMock(): Promise<Etiqueta[]> {
  return Promise.resolve(
    etiquetasEstaticas.filter((etiqueta) => etiqueta.activo).sort((a, b) => a.orden - b.orden),
  );
}
