/**
 * Métricas del reporte.
 *
 * El panel es SÓLO LECTURA. En producción estas cifras salen de consultas de agregación
 * de Firestore (`count`, `sum`, `average`), que cuentan del lado del servidor sin bajar
 * los documentos (docs/PLAN.md §2 y §8).
 */

import { obtenerMetricasMock } from './metricasMock';
import type { RangoFechas } from '@/lib/formato/fechas';

const usarMock = import.meta.env.VITE_DATOS_MOCK === 'true';

/** Una tarjeta de estadística de la cabecera: valor grande y variación vs. el periodo
 *  anterior. El `delta` es la fracción de cambio (0.124 = +12.4%); `null` cuando no hay
 *  periodo anterior con el que comparar. */
export interface Estadistica {
  /** Valor ya formateado para mostrar (`1,428`, `99.4%`). */
  valor: string;
  /** Variación respecto al periodo anterior, como fracción. Positivo = al alza. */
  delta: number | null;
  /** Texto corto que acompaña al delta (`vs. periodo anterior`). */
  contexto: string;
}

/** Las cuatro estadísticas de la cabecera. */
export interface EstadisticasReporte {
  viajesAuditados: Estadistica;
  incidenciasRegistradas: Estadistica;
  evidenciasFotograficas: Estadistica;
  efectividadCustodia: Estadistica;
}

/** Un punto de una serie categórica (barras, pastel). */
export interface PuntoCategoria {
  categoria: string;
  valor: number;
}

/** Un punto de una serie temporal/acumulada. */
export interface PuntoSerie {
  etiqueta: string;
  valor: number;
}

/** Los datos de las gráficas del reporte. */
export interface GraficasReporte {
  /** Viajes descartados, agrupados por motivo. */
  descartesPorMotivo: PuntoCategoria[];
  /** Distribución horaria de las capturas, por hora del día (0–23). */
  capturasPorHora: PuntoSerie[];
  /** GB acumulados de evidencia por día del periodo. */
  gbAcumulados: PuntoSerie[];
}

/** El paquete completo que consume la pantalla de reporte. */
export interface Metricas {
  /** Folio del reporte, derivado del periodo (`EXP-2026-09-MX`). */
  folio: string;
  periodo: RangoFechas;
  estadisticas: EstadisticasReporte;
  graficas: GraficasReporte;
}

export function obtenerMetricas(periodo: RangoFechas): Promise<Metricas> {
  if (usarMock) return obtenerMetricasMock(periodo);
  // La rama real vive en su propio módulo y se importa de forma diferida: así el
  // camino de desarrollo (`VITE_DATOS_MOCK=true`) no carga el SDK de Firestore sólo
  // para el reporte, y el módulo de agregaciones sólo entra al bundle cuando se usa.
  return import('./metricasFirestore').then((m) => m.obtenerMetricasFirestore(periodo));
}

/**
 * Folio del reporte derivado del periodo. Formato `EXP-AAAA-MM-MX` cuando el rango cae
 * dentro de un mes, o `EXP-AAAA-MM_a_MM-MX` cuando cruza meses. El folio identifica el
 * corte que el analista entrega; no es un dato externo.
 */
export function folioDePeriodo(periodo: RangoFechas): string {
  const [anioD, mesD] = periodo.desde.split('-');
  const [anioH, mesH] = periodo.hasta.split('-');
  if (anioD === anioH && mesD === mesH) return `EXP-${anioD}-${mesD}-MX`;
  return `EXP-${anioD}-${mesD}_a_${anioH}-${mesH}-MX`;
}
