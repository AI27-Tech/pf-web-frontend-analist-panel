/**
 * ESTE ARCHIVO ES DE DESARROLLO. Se borra cuando el reporte consuma las agregaciones
 * reales de Firestore.
 *
 * Calcula las mismas cifras que producirán las consultas de agregación, pero sobre el
 * arreglo estático de `viajesMock.ts`. Así la pantalla se ve poblada y con números
 * coherentes entre la cabecera y las gráficas, sin inventar valores sueltos: todo sale
 * de los mismos viajes que ya muestra la lista.
 */

import { folioDePeriodo } from './metricas';
import type {
  EstadisticasReporte,
  GraficasReporte,
  Metricas,
  PuntoCategoria,
  PuntoSerie,
} from './metricas';
import type { Viaje } from './tipos';
import { viajesEstaticos } from './viajesMock';
import type { RangoFechas } from '@/lib/formato/fechas';

const ZONA = 'America/Mexico_City';

const enteros = new Intl.NumberFormat('es-MX');

/** Viajes cuyo `fechaLocal` cae dentro del rango. */
function viajesDelPeriodo(periodo: RangoFechas): Viaje[] {
  return viajesEstaticos.filter(
    (viaje) => viaje.fechaLocal >= periodo.desde && viaje.fechaLocal <= periodo.hasta,
  );
}

/** Fracción de cambio entre dos cantidades. */
function delta(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return (actual - anterior) / anterior;
}

/** El periodo inmediatamente anterior, del mismo número de días, para el `delta`. */
function periodoAnterior(periodo: RangoFechas): RangoFechas {
  const desde = new Date(`${periodo.desde}T00:00:00Z`);
  const hasta = new Date(`${periodo.hasta}T00:00:00Z`);
  const dias = Math.round((hasta.getTime() - desde.getTime()) / 86_400_000) + 1;
  const finAnterior = new Date(desde.getTime() - 86_400_000);
  const inicioAnterior = new Date(finAnterior.getTime() - (dias - 1) * 86_400_000);
  return {
    desde: inicioAnterior.toISOString().slice(0, 10),
    hasta: finAnterior.toISOString().slice(0, 10),
  };
}

/** Suma las evidencias fotográficas de un conjunto de viajes. */
function totalFotos(viajes: Viaje[]): number {
  return viajes.reduce((suma, viaje) => suma + viaje.fotos, 0);
}

/** Viajes con novedad. */
function conNovedad(viajes: Viaje[]): number {
  return viajes.filter((viaje) => viaje.isUpdated).length;
}

/** Efectividad de custodia sobre los viajes CERRADOS: fracción de cerrados sin novedad.
 *  Se mide sólo sobre viajes terminados, `null` si no hay ninguno cerrado en el periodo.
 */
function efectividad(viajes: Viaje[]): number | null {
  const cerrados = viajes.filter((viaje) => viaje.ciclo === 'CERRADO');
  if (cerrados.length === 0) return null;
  const limpios = cerrados.filter((viaje) => !viaje.isUpdated).length;
  return limpios / cerrados.length;
}

function estadisticas(periodo: RangoFechas): EstadisticasReporte {
  const actuales = viajesDelPeriodo(periodo);
  const previos = viajesDelPeriodo(periodoAnterior(periodo));

  const auditadosA = actuales.length;
  const auditadosP = previos.length;

  const incidenciasA = conNovedad(actuales);
  const incidenciasP = conNovedad(previos);

  const fotosA = totalFotos(actuales);
  const fotosP = totalFotos(previos);

  const efectividadA = efectividad(actuales);
  const efectividadP = efectividad(previos);

  return {
    viajesAuditados: {
      valor: enteros.format(auditadosA),
      delta: delta(auditadosA, auditadosP),
      contexto: 'vs. periodo anterior',
    },
    incidenciasRegistradas: {
      valor: enteros.format(incidenciasA),
      delta: delta(incidenciasA, incidenciasP),
      contexto: 'eventos con novedad',
    },
    evidenciasFotograficas: {
      valor: enteros.format(fotosA),
      delta: delta(fotosA, fotosP),
      contexto: 'archivos capturados en ruta',
    },
    efectividadCustodia: {
      valor: efectividadA === null ? '—' : `${(efectividadA * 100).toFixed(1)}%`,
      delta: efectividadA === null || efectividadP === null ? null : efectividadA - efectividadP,
      contexto: 'viajes cerrados sin novedad',
    },
  };
}

/** Hora del día (0–23) en zona de México a partir de un instante. */
function horaDelDia(instante: Date): number {
  return (
    Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: ZONA,
        hour: '2-digit',
        hour12: false,
      }).format(instante),
    ) % 24
  );
}

/** Distribución horaria de capturas. */
function capturasPorHora(viajes: Viaje[]): PuntoSerie[] {
  const conteo = new Array<number>(24).fill(0);
  for (const viaje of viajes) {
    const hora = horaDelDia(viaje.abiertoEn);
    conteo[hora] = (conteo[hora] ?? 0) + viaje.fotos;
  }
  return conteo.map((valor, hora) => ({
    etiqueta: `${String(hora).padStart(2, '0')}h`,
    valor,
  }));
}

/** Motivos de descarte de muestra, para que la gráfica se vea poblada con varias barras
 *  mientras el arreglo estático sólo tiene un viaje DESCARTADO. Se suman a los descartes
 *  reales del periodo; desaparecen cuando el reporte consuma las agregaciones reales. */
const DESCARTES_DEMO: PuntoCategoria[] = [
  { categoria: 'Ruta modificada por el operador', valor: 2 },
  { categoria: 'Unidad fuera de servicio', valor: 1 },
  { categoria: 'Evidencia incompleta', valor: 1 },
];

/** Descartes agrupados por su motivo. Sólo los viajes con ciclo DESCARTADO cuentan; a
 *  esos se les suman los motivos de muestra para visualizar más información. */
function descartesPorMotivo(viajes: Viaje[]): PuntoCategoria[] {
  const conteo = new Map<string, number>();
  for (const viaje of viajes) {
    if (viaje.ciclo !== 'DESCARTADO') continue;
    const motivo = viaje.motivoDescarte ?? 'Sin motivo registrado';
    conteo.set(motivo, (conteo.get(motivo) ?? 0) + 1);
  }
  for (const { categoria, valor } of DESCARTES_DEMO) {
    conteo.set(categoria, (conteo.get(categoria) ?? 0) + valor);
  }
  return [...conteo.entries()].map(([categoria, valor]) => ({ categoria, valor }));
}

/** Peso aproximado de una evidencia fotográfica, para el acumulado de almacenamiento.
 *  El original de la app hoy pesa ~1.2 MB (1920×1080 JPEG q88, docs/PLAN.md §5). */
const BYTES_POR_FOTO = 1.2 * 1024 * 1024;

/** GB acumulados de evidencia por día del periodo: suma corrida del peso de las fotos
 *  de cada día. Es el mismo acumulado que dará `sum(sizeBytes)` sobre `medios`. */
function gbAcumulados(viajes: Viaje[], periodo: RangoFechas): PuntoSerie[] {
  const porDia = new Map<string, number>();
  for (const viaje of viajes) {
    porDia.set(viaje.fechaLocal, (porDia.get(viaje.fechaLocal) ?? 0) + viaje.fotos);
  }
  const dias = [...porDia.keys()].sort();
  const serie: PuntoSerie[] = [];
  let acumuladoBytes = 0;
  for (const dia of dias) {
    if (dia < periodo.desde || dia > periodo.hasta) continue;
    acumuladoBytes += (porDia.get(dia) ?? 0) * BYTES_POR_FOTO;
    serie.push({
      etiqueta: dia.slice(5), // MM-DD
      valor: Number((acumuladoBytes / (1024 * 1024 * 1024)).toFixed(2)),
    });
  }
  return serie;
}

function graficas(periodo: RangoFechas): GraficasReporte {
  const viajes = viajesDelPeriodo(periodo);
  return {
    descartesPorMotivo: descartesPorMotivo(viajes),
    capturasPorHora: capturasPorHora(viajes),
    gbAcumulados: gbAcumulados(viajes, periodo),
  };
}

export function obtenerMetricasMock(periodo: RangoFechas): Promise<Metricas> {
  return Promise.resolve({
    folio: folioDePeriodo(periodo),
    periodo,
    estadisticas: estadisticas(periodo),
    graficas: graficas(periodo),
  });
}
