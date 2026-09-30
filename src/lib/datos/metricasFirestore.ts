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

import { obtenerNombresCustodios } from './custodios';
import { folioDePeriodo } from './metricas';
import type {
  EstadisticasReporte,
  GraficasReporte,
  Metricas,
  PuntoCategoria,
  PuntoSerie,
} from './metricas';
import type { CicloViaje, EstadisticaCustodio, EstadisticaUnidad, FilaViaje } from './tipos';
import type { RangoFechas } from '@/lib/formato/fechas';

const ZONA = 'America/Mexico_City';
const enteros = new Intl.NumberFormat('es-MX');

/** Tope de documentos por consulta. Acota el costo y evita traer un corpus enorme al
 *  navegador; para un periodo mensual de este panel queda muy por encima de lo real. */
const TOPE = 5000;

/** Forma mínima de un reporte que las métricas necesitan, ya normalizada. */
interface ReporteLite {
  id: string;
  ciclo: string;
  hayNovedad: boolean;
  motivoDescarte: string | null;
  custodioUid: string;
  placas: string;
  fechaLocal: string;
}

/** Forma mínima de un medio que las métricas necesitan, ya normalizada. */
interface MedioLite {
  tipo: string;
  fechaLocal: string;
  sizeBytes: number;
  capturadoEn: Date | null;
  viajeId: string;
  custodioUid: string;
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

function aReporteLite(id: string, d: DocumentData): ReporteLite {
  return {
    id,
    ciclo: typeof d.ciclo === 'string' ? d.ciclo : 'ACTIVO',
    hayNovedad: d.hayNovedad === true,
    motivoDescarte: typeof d.motivoDescarte === 'string' ? d.motivoDescarte : null,
    custodioUid: typeof d.custodioUid === 'string' ? d.custodioUid : '',
    placas: typeof d.placas === 'string' ? d.placas : '',
    fechaLocal: typeof d.fechaLocal === 'string' ? d.fechaLocal : '',
  };
}

function aMedioLite(d: DocumentData): MedioLite {
  return {
    tipo: typeof d.tipo === 'string' ? d.tipo : 'FOTO',
    fechaLocal: typeof d.fechaLocal === 'string' ? d.fechaLocal : '',
    sizeBytes: typeof d.sizeBytes === 'number' ? d.sizeBytes : 0,
    capturadoEn: d.createdAtDevice?.toDate?.() ?? null,
    // El vínculo al viaje se llama `reporteId` en el contrato del productor, igual que
    // en `medios.ts` (mapper de la galería/expediente). NO es `viajeId`.
    viajeId: typeof d.reporteId === 'string' ? d.reporteId : '',
    custodioUid: typeof d.custodioUid === 'string' ? d.custodioUid : '',
  };
}

async function traerReportes(periodo: RangoFechas): Promise<ReporteLite[]> {
  const snap = await getDocs(rango('reportes', periodo));
  return snap.docs.map((doc) => aReporteLite(doc.id, doc.data()));
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
  };
}

/**
 * Estadísticas por custodio: una fila por `custodioUid` que aparezca en los reportes o
 * medios del periodo. Los viajes se cuentan por `custodioUid` del reporte; las fotos y
 * audios por `custodioUid` del medio. El nombre se resuelve una sola vez fuera de aquí.
 */
function agruparPorCustodio(
  reportes: ReporteLite[],
  medios: MedioLite[],
  nombres: Map<string, string>,
): EstadisticaCustodio[] {
  const porUid = new Map<string, { viajes: Set<string>; fotos: number; audios: number }>();
  const asegurar = (uid: string) => {
    let entrada = porUid.get(uid);
    if (!entrada) {
      entrada = { viajes: new Set(), fotos: 0, audios: 0 };
      porUid.set(uid, entrada);
    }
    return entrada;
  };

  for (const r of reportes) {
    if (r.custodioUid === '') continue;
    asegurar(r.custodioUid).viajes.add(r.id);
  }
  for (const m of medios) {
    if (m.custodioUid === '') continue;
    const entrada = asegurar(m.custodioUid);
    if (m.tipo === 'FOTO') entrada.fotos += 1;
    else if (m.tipo === 'AUDIO') entrada.audios += 1;
  }

  return [...porUid.entries()].map(([uid, datos]) => ({
    uid,
    nombre: nombres.get(uid) ?? uid,
    viajes: datos.viajes.size,
    fotos: datos.fotos,
    audios: datos.audios,
  }));
}

/**
 * Registro por viaje: una fila por reporte del periodo. Los medios agregan sus conteos y
 * pueden sumar custodios adicionales (misma placa, distinto custodio en distintos
 * momentos), así que `custodios` es el conjunto de todos los que participaron.
 */
function agruparPorViaje(
  reportes: ReporteLite[],
  medios: MedioLite[],
  nombres: Map<string, string>,
): FilaViaje[] {
  const porViaje = new Map<
    string,
    {
      placas: string;
      custodios: Set<string>;
      fechaLocal: string;
      fotos: number;
      audios: number;
      ciclo: CicloViaje;
      hayNovedad: boolean;
    }
  >();

  for (const r of reportes) {
    const ciclo: CicloViaje =
      r.ciclo === 'CERRADO' || r.ciclo === 'DESCARTADO' ? r.ciclo : 'ACTIVO';
    porViaje.set(r.id, {
      placas: r.placas,
      custodios: new Set(r.custodioUid === '' ? [] : [r.custodioUid]),
      fechaLocal: r.fechaLocal,
      fotos: 0,
      audios: 0,
      ciclo,
      hayNovedad: r.hayNovedad,
    });
  }

  for (const m of medios) {
    const v = porViaje.get(m.viajeId);
    if (!v) continue;
    if (m.tipo === 'FOTO') v.fotos += 1;
    else if (m.tipo === 'AUDIO') v.audios += 1;
    if (m.custodioUid !== '') v.custodios.add(m.custodioUid);
  }

  return [...porViaje.entries()].map(([id, v]) => ({
    id,
    placas: v.placas,
    custodios: [...v.custodios].map((uid) => nombres.get(uid) ?? uid),
    fechaLocal: v.fechaLocal,
    fotos: v.fotos,
    audios: v.audios,
    ciclo: v.ciclo,
    hayNovedad: v.hayNovedad,
  }));
}

/**
 * Viajes por unidad (placa): cuenta cuántos reportes del periodo tiene cada placa.
 * Los reportes sin placa registrada se omiten. Ordenado por número de viajes descendente.
 */
function agruparPorUnidad(reportes: ReporteLite[]): EstadisticaUnidad[] {
  const porPlaca = new Map<string, number>();
  for (const r of reportes) {
    if (r.placas === '') continue;
    porPlaca.set(r.placas, (porPlaca.get(r.placas) ?? 0) + 1);
  }
  return [...porPlaca.entries()]
    .map(([placas, viajes]) => ({ placas, viajes }))
    .sort((a, b) => b.viajes - a.viajes);
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

  // Nombres de custodio resueltos UNA sola vez sobre el conjunto de uids del periodo
  // actual (reportes + medios). `obtenerNombresCustodios` deduplica y siempre devuelve
  // una cadena (nombre → teléfono → uid), así que ninguna tabla queda con celda vacía.
  const uids = [...reportesA.map((r) => r.custodioUid), ...mediosA.map((m) => m.custodioUid)];
  const nombres = await obtenerNombresCustodios(uids);

  return {
    folio: folioDePeriodo(periodo),
    periodo,
    estadisticas: estadisticas(reportesA, reportesP, mediosA, mediosP),
    graficas: graficas(reportesA, mediosA),
    porCustodio: agruparPorCustodio(reportesA, mediosA, nombres),
    porViaje: agruparPorViaje(reportesA, mediosA, nombres),
    porUnidad: agruparPorUnidad(reportesA),
  };
}
