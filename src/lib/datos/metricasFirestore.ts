/**
 * Métricas del reporte contra Firestore (docs/PLAN.md §8).
 *
 * El panel es SÓLO LECTURA. ESTRATEGIA: una LECTURA ACOTADA por periodo, agregada EN EL
 * CLIENTE, con una sola consulta por `fechaLocal` (que usa el índice de campo único
 * AUTOMÁTICO de Firestore, sin índices compuestos que declarar ni desplegar).
 *
 * Las tarjetas, las tablas y los rankings se calculan sólo desde los `reportes` (un
 * documento por viaje): el conteo de fotos y audios sale de cada reporte (`conteoDeMedios`,
 * que respeta que `resumenMedios` es un snapshot de cierre).
 *
 * Consecuencias que hay que tener presentes:
 *  - Un viaje ACTIVO no separa fotos de audios: se reporta `mediosSubidos` como fotos.
 *  - Los totales por custodio se atribuyen al dueño del viaje, no a quien sube cada archivo.
 *  - `FilaViaje.custodios` trae sólo al dueño del viaje.
 *
 * `TOPE` acota cuántos documentos se bajan por seguridad: es un muestreo, no el corpus
 * infinito (PLAN §8). Si un periodo lo rebasa, se descartan los registros MÁS ANTIGUOS y
 * se conservan los más recientes, y `Metricas.cobertura` lo declara para que la pantalla
 * lo avise.
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
import { TOPE_LECTURA_METRICAS, folioDePeriodo } from './metricas';
import type {
  EstadisticasReporte,
  GraficasReporte,
  Metricas,
  OpcionesMetricas,
  PuntoCategoria,
  PuntoSerie,
} from './metricas';
import type { EstadisticaCustodio, EstadisticaUnidad, FilaViaje } from './tipos';
import { conteoDeMedios } from './viajesFirestore';
import type { RangoFechas } from '@/lib/formato/fechas';

const ZONA = 'America/Mexico_City';
const enteros = new Intl.NumberFormat('es-MX');

/** Tope de documentos POR CONSULTA (no por unidad): cada lectura —reportes del periodo,
 *  reportes del periodo anterior y medios del periodo— trae como máximo esta cantidad, con
 *  todas las unidades juntas. Acota el costo y evita traer un corpus enorme al navegador.
 *  Se trae TOPE+1 para detectar si hay más registros allá del límite. */
const TOPE = TOPE_LECTURA_METRICAS;

/** Forma mínima de un reporte que las métricas necesitan, ya normalizada. */
interface ReporteLite {
  id: string;
  ciclo: string;
  hayNovedad: boolean;
  motivoDescarte: string | null;
  custodioUid: string;
  placas: string;
  fechaLocal: string;
  /** Conteo de fotos y audios del viaje, desde el propio reporte (ver `conteoDeMedios`). */
  fotos: number;
  audios: number;
}

/** Forma mínima de un medio que las gráficas por hora y de GB necesitan. */
interface MedioLite {
  tipo: string;
  fechaLocal: string;
  sizeBytes: number;
  capturadoEn: Date | null;
}

/** Lo leído de una colección y si la lectura se cortó por el tope. */
interface Lectura<T> {
  datos: T[];
  recortado: boolean;
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
 * Consulta base por rango de `fechaLocal`, de lo más reciente a lo más antiguo.
 * Trae TOPE+1 documentos para detectar si hay más registros allá del límite. Como el
 * orden es descendente, lo que queda fuera del tope son los registros más antiguos.
 * Las funciones llamadoras descartan el +1 si existe y devuelven los documentos en
 * orden ascendente, que es el que espera el resto del cálculo.
 */
function rango(coleccion: string, periodo: RangoFechas): Query {
  return query(
    collection(firestore, coleccion),
    where('fechaLocal', '>=', periodo.desde),
    where('fechaLocal', '<=', periodo.hasta),
    orderBy('fechaLocal', 'desc'),
    limit(TOPE + 1),
  );
}

function aReporteLite(id: string, d: DocumentData): ReporteLite {
  const { fotos, audios } = conteoDeMedios(d);
  return {
    id,
    ciclo: typeof d.ciclo === 'string' ? d.ciclo : 'ACTIVO',
    hayNovedad: d.hayNovedad === true,
    motivoDescarte: typeof d.motivoDescarte === 'string' ? d.motivoDescarte : null,
    custodioUid: typeof d.custodioUid === 'string' ? d.custodioUid : '',
    placas: typeof d.placas === 'string' ? d.placas : '',
    fechaLocal: typeof d.fechaLocal === 'string' ? d.fechaLocal : '',
    fotos,
    audios,
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

async function traerReportes(periodo: RangoFechas): Promise<Lectura<ReporteLite>> {
  const snap = await getDocs(rango('reportes', periodo));
  const recortado = snap.docs.length > TOPE;
  // Descarta el +1 (el más antiguo) y vuelve al orden ascendente por fecha.
  const docs = snap.docs.slice(0, TOPE).reverse();
  if (recortado) {
    console.warn(
      `[Métricas] Hay más de ${TOPE} reportes en el periodo ${periodo.desde} a ${periodo.hasta}. Se devuelven solo los ${TOPE} más recientes.`,
    );
  }
  return { datos: docs.map((doc) => aReporteLite(doc.id, doc.data())), recortado };
}

async function traerMedios(periodo: RangoFechas): Promise<Lectura<MedioLite>> {
  const snap = await getDocs(rango('medios', periodo));
  const recortado = snap.docs.length > TOPE;
  // Descarta el +1 (el más antiguo) y vuelve al orden ascendente por fecha.
  const docs = snap.docs.slice(0, TOPE).reverse();
  if (recortado) {
    console.warn(
      `[Métricas] Hay más de ${TOPE} medios en el periodo ${periodo.desde} a ${periodo.hasta}. Se devuelven solo los ${TOPE} más recientes.`,
    );
  }
  return { datos: docs.map((doc) => aMedioLite(doc.data())), recortado };
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

function estadisticas(reportesA: ReporteLite[], reportesP: ReporteLite[]): EstadisticasReporte {
  const auditadosA = reportesA.length;
  const auditadosP = reportesP.length;

  const incidenciasA = reportesA.filter((r) => r.hayNovedad).length;
  const incidenciasP = reportesP.filter((r) => r.hayNovedad).length;

  const fotosA = reportesA.reduce((suma, r) => suma + r.fotos, 0);
  const fotosP = reportesP.reduce((suma, r) => suma + r.fotos, 0);

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
 * Estadísticas por custodio: una fila por `custodioUid` dueño de algún reporte del periodo.
 * Viajes, fotos y audios salen de los propios reportes, así que se atribuyen al custodio
 * que abrió el viaje, no a quien subió cada archivo. El nombre se resuelve una sola vez
 * fuera de aquí.
 */
function agruparPorCustodio(
  reportes: ReporteLite[],
  nombres: Map<string, string>,
): EstadisticaCustodio[] {
  const porUid = new Map<string, EstadisticaCustodio>();

  for (const r of reportes) {
    if (r.custodioUid === '') continue;
    let entrada = porUid.get(r.custodioUid);
    if (!entrada) {
      entrada = {
        uid: r.custodioUid,
        nombre: nombres.get(r.custodioUid) ?? r.custodioUid,
        viajes: 0,
        fotos: 0,
        audios: 0,
      };
      porUid.set(r.custodioUid, entrada);
    }
    entrada.viajes += 1;
    entrada.fotos += r.fotos;
    entrada.audios += r.audios;
  }

  return [...porUid.values()];
}

/**
 * Registro por viaje: una fila por reporte del periodo, con los conteos del propio
 * reporte. `custodios` trae sólo al dueño del viaje: los demás custodios que suban
 * archivos al mismo viaje no se ven sin leer `medios`.
 */
function agruparPorViaje(reportes: ReporteLite[], nombres: Map<string, string>): FilaViaje[] {
  return reportes.map((r) => ({
    id: r.id,
    placas: r.placas,
    custodios: r.custodioUid === '' ? [] : [nombres.get(r.custodioUid) ?? r.custodioUid],
    fechaLocal: r.fechaLocal,
    fotos: r.fotos,
    audios: r.audios,
    ciclo: r.ciclo === 'CERRADO' || r.ciclo === 'DESCARTADO' ? r.ciclo : 'ACTIVO',
    hayNovedad: r.hayNovedad,
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

export async function obtenerMetricasFirestore(
  periodo: RangoFechas,
  { conMedios = true }: OpcionesMetricas = {},
): Promise<Metricas> {
  const previo = periodoAnterior(periodo);
  // Hasta tres lecturas por rango de `fechaLocal`, todas con el índice de campo único
  // automático. Las tarjetas, tablas y rankings salen sólo de los `reportes` (actual y
  // anterior).
  const sinMedios: Lectura<MedioLite> = { datos: [], recortado: false };
  const [reportesA, reportesP, mediosA] = await Promise.all([
    traerReportes(periodo),
    traerReportes(previo),
    conMedios ? traerMedios(periodo) : Promise.resolve(sinMedios),
  ]);

  // Nombres de custodio resueltos UNA sola vez sobre los dueños de los reportes del
  // periodo. `obtenerNombresCustodios` deduplica y siempre devuelve una cadena
  // (nombre → teléfono → uid), así que ninguna tabla queda con celda vacía.
  const nombres = await obtenerNombresCustodios(reportesA.datos.map((r) => r.custodioUid));

  return {
    folio: folioDePeriodo(periodo),
    periodo,
    cobertura: {
      reportesRecortados: reportesA.recortado,
      mediosRecortados: mediosA.recortado,
    },
    estadisticas: estadisticas(reportesA.datos, reportesP.datos),
    graficas: graficas(reportesA.datos, mediosA.datos),
    porCustodio: agruparPorCustodio(reportesA.datos, nombres),
    porViaje: agruparPorViaje(reportesA.datos, nombres),
    porUnidad: agruparPorUnidad(reportesA.datos),
  };
}
