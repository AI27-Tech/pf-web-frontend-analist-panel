/**
 * Derivaciones en cliente para las gráficas de «Actividad del periodo». Son funciones
 * puras sobre los viajes YA FILTRADOS que baja `ReporteSection`, así cada gráfica responde
 * al filtro global sin tocar la capa de datos ni Firestore.
 *
 * No inventan campos: todo sale de lo que `FilaViaje` ya trae (`fechaLocal`, `ciclo`).
 */

import type { PuntoCategoria, PuntoSerie } from '@/lib/datos/metricas';
import type { CicloViaje, FilaViaje } from '@/lib/datos/tipos';

/** Etiqueta corta `MM-DD` de una fecha `YYYY-MM-DD`. */
function etiquetaDia(fechaLocal: string): string {
  return fechaLocal.slice(5);
}

/** Viajes por día del periodo, ordenado por fecha. */
export function viajesPorDia(viajes: FilaViaje[]): PuntoSerie[] {
  const porDia = new Map<string, number>();
  for (const v of viajes) {
    if (v.fechaLocal === '') continue;
    porDia.set(v.fechaLocal, (porDia.get(v.fechaLocal) ?? 0) + 1);
  }
  return [...porDia.keys()]
    .sort()
    .map((dia) => ({ etiqueta: etiquetaDia(dia), valor: porDia.get(dia) ?? 0 }));
}

/** Etiquetas legibles del ciclo, para la gráfica de composición. */
const ETIQUETA_CICLO: Record<CicloViaje, string> = {
  ACTIVO: 'Activo',
  CERRADO: 'Cerrado',
  DESCARTADO: 'Descartado',
};

/** Distribución de viajes por estado (ciclo), como categorías para una dona. */
export function distribucionPorCiclo(viajes: FilaViaje[]): PuntoCategoria[] {
  const conteo = new Map<CicloViaje, number>();
  for (const v of viajes) {
    conteo.set(v.ciclo, (conteo.get(v.ciclo) ?? 0) + 1);
  }
  return [...conteo.entries()].map(([ciclo, valor]) => ({
    categoria: ETIQUETA_CICLO[ciclo],
    valor,
  }));
}
