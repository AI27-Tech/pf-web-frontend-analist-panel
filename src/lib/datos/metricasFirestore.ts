/**
 * Métricas del reporte contra Firestore (docs/PLAN.md §8).
 *
 * El panel es SÓLO LECTURA. ESTRATEGIA: una LECTURA ACOTADA por colección y periodo,
 * agregada EN EL CLIENTE. En lugar de disparar ~10 consultas de agregación (`count`),
 * cada una con su propio índice compuesto, se traen los `reportes` y `medios` del rango
 * con una sola consulta por `fechaLocal` (que usa el índice de campo único AUTOMÁTICO de
 * Firestore, sin índices compuestos que declarar ni desplegar) y se calcula todo en
 * memoria.
 *
 * Por qué es aceptable aquí: un analista, periodos mensuales, ~37 custodios. El volumen
 * de documentos es chico, así que traerlos y contarlos en el navegador cuesta poco y
 * evita por completo la gestión de índices. Si algún día el corpus crece, la sección de
 * cabecera puede volver a agregaciones `count` del lado del servidor —el contrato de
 * `Metricas` no cambia—, pero eso exige declarar los índices compuestos correspondientes.
 *
 * `TOPE` acota cuántos documentos se bajan por seguridad: es un muestreo, no el corpus
 * infinito (PLAN §8).
 */

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
  type Query,
} from 'firebase/firestore';

import { firestore } from '@/lib/firebase/cliente';

import { folioDePeriodo } from './metricas';
import type {
  EstadisticasReporte,
  GraficasReporte,
  Metricas,
  PuntoCategoria,
  PuntoSerie,
} from './metricas';
import type { RangoFechas } from '@/lib/formato/fechas';

const ZONA = 'America/Mexico_City';
const enteros = new Intl.NumberFormat('es-MX');

/** Tope de documentos por consulta. Acota el costo y evita traer un corpus enorme al
 *  navegador; para un periodo mensual de este panel queda muy por encima de lo real. */
const TOPE = 5000;

/** Forma mínima de un reporte que las métricas necesitan, ya normalizada. */
interface ReporteLite {
  ciclo: string;
  hayNovedad: boolean;
  motivoDescarte: string | null;
}

/** Forma mínima de un medio que las métricas necesitan, ya normalizada. */
interface MedioLite {
  tipo: string;
  fechaLocal: string;
  sizeBytes: number;
  capturadoEn: Date | null;
}

/** Fracción de cambio entre dos cantidades; `null` si no hay base con la que comparar. */
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

/**
 * Consulta base por rango de `fechaLocal`.
 */
function rango(coleccion: string, periodo: RangoFechas): Query {
  return query(
    collection(firestore, coleccion),
    where('fechaLocal', '>=', periodo.desde),
    where('fechaLocal', '<=', periodo.hasta),
    orderBy('fechaLocal', 'asc'),
    limit(TOPE),
  );
}

function aReporteLite(d: DocumentData): ReporteLite {
  return {
    ciclo: typeof d.ciclo === 'string' ? d.ciclo : 'ACTIVO',
    hayNovedad: d.hayNovedad === true,
    motivoDescarte: typeof d.motivoDescarte === 'string' ? d.motivoDescarte : null,
  };
}

function aMedioLite(d: DocumentData): MedioLite {
  return {
    tipo: typeof d.tipo === 'string' ? d.tipo : 'FOTO',
    fechaLocal: typeof d.fechaLocal === 'string' ? d.fechaLocal : '',
    sizeBytes: typeof d.sizeBytes === 'number' ? d.sizeBytes : 0,
    capturadoEn: d.createdAtDevice?.toDate?.() ?? null,
  };
}

async function traerReportes(periodo: RangoFechas): Promise<ReporteLite[]> {
  const snap = await getDocs(rango('reportes', periodo));
  return snap.docs.map((doc) => aReporteLite(doc.data()));
}

async function traerMedios(periodo: RangoFechas): Promise<MedioLite[]> {
  const snap = await getDocs(rango('medios', periodo));
  return snap.docs.map((doc) => aMedioLite(doc.data()));
}

/** Hora del día (0–23) en zona de México a partir de un instante. */
function horaDelDia(instante: Date): number {
  return (
    Number(
      new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hour: '2-digit', hour12: false }).format(
        instante,
      ),
    ) % 24
  );
}

function estadisticas(
  reportesA: ReporteLite[],
  reportesP: ReporteLite[],
  mediosA: MedioLite[],
  mediosP: MedioLite[],
): EstadisticasReporte {
  const auditadosA = reportesA.length;
  const auditadosP = reportesP.length;

  const incidenciasA = reportesA.filter((r) => r.hayNovedad).length;
  const incidenciasP = reportesP.filter((r) => r.hayNovedad).length;

  const fotosA = mediosA.filter((m) => m.tipo === 'FOTO').length;
  const fotosP = mediosP.filter((m) => m.tipo === 'FOTO').length;

  const cerradosA = reportesA.filter((r) => r.ciclo === 'CERRADO');
  const cerradosP = reportesP.filter((r) => r.ciclo === 'CERRADO');
  const efectividadA =
    cerradosA.length === 0 ? null : cerradosA.filter((r) => !r.hayNovedad).length / cerradosA.length;
  const efectividadP =
    cerradosP.length === 0 ? null : cerradosP.filter((r) => !r.hayNovedad).length / cerradosP.length;

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

/** Descartes agrupados por su motivo, desde los reportes DESCARTADOS del periodo. */
function descartesPorMotivo(reportes: ReporteLite[]): PuntoCategoria[] {
  const conteo = new Map<string, number>();
  for (const r of reportes) {
    if (r.ciclo !== 'DESCARTADO') continue;
    const motivo = r.motivoDescarte ?? 'Sin motivo registrado';
    conteo.set(motivo, (conteo.get(motivo) ?? 0) + 1);
  }
  return [...conteo.entries()].map(([categoria, valor]) => ({ categoria, valor }));
}

/** Distribución horaria de capturas (fotos) por hora del día en zona de México. */
function capturasPorHora(medios: MedioLite[]): PuntoSerie[] {
  const porHora = new Array<number>(24).fill(0);
  for (const m of medios) {
    if (m.tipo !== 'FOTO' || m.capturadoEn === null) continue;
    const hora = horaDelDia(m.capturadoEn);
    porHora[hora] = (porHora[hora] ?? 0) + 1;
  }
  return porHora.map((valor, hora) => ({ etiqueta: `${String(hora).padStart(2, '0')}h`, valor }));
}

/** GB acumulados de evidencia por día del periodo (suma corrida de `sizeBytes`). */
function gbAcumulados(medios: MedioLite[]): PuntoSerie[] {
  const bytesPorDia = new Map<string, number>();
  for (const m of medios) {
    if (m.fechaLocal === '') continue;
    bytesPorDia.set(m.fechaLocal, (bytesPorDia.get(m.fechaLocal) ?? 0) + m.sizeBytes);
  }
  const dias = [...bytesPorDia.keys()].sort();
  let acumulado = 0;
  return dias.map((dia) => {
    acumulado += bytesPorDia.get(dia) ?? 0;
    return { etiqueta: dia.slice(5), valor: Number((acumulado / (1024 * 1024 * 1024)).toFixed(2)) };
  });
}

function graficas(reportesA: ReporteLite[], mediosA: MedioLite[]): GraficasReporte {
  return {
    descartesPorMotivo: descartesPorMotivo(reportesA),
    capturasPorHora: capturasPorHora(mediosA),
    gbAcumulados: gbAcumulados(mediosA),
  };
}

export async function obtenerMetricasFirestore(periodo: RangoFechas): Promise<Metricas> {
  const previo = periodoAnterior(periodo);
  // Cuatro lecturas por rango de `fechaLocal` (dos colecciones × dos periodos), todas
  // con el índice de campo único automático.
  const [reportesA, reportesP, mediosA, mediosP] = await Promise.all([
    traerReportes(periodo),
    traerReportes(previo),
    traerMedios(periodo),
    traerMedios(previo),
  ]);

  return {
    folio: folioDePeriodo(periodo),
    periodo,
    estadisticas: estadisticas(reportesA, reportesP, mediosA, mediosP),
    graficas: graficas(reportesA, mediosA),
  };
}
