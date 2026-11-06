import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';

import { firestore, storage } from '@/lib/firebase/cliente';
import type { RangoFechas } from '@/lib/formato/fechas';
import { enriquecerMediosConNombres } from './custodios';

import type { FiltrosMedio, Medio } from './tipos';

function aMedio(id: string, d: DocumentData): Medio {
  return {
    id,
    viajeId: d.reporteId ?? '',
    tipo: d.tipo ?? 'FOTO',
    // Contrato real: `etiquetas` es un ARRAY (pf-app-custodio §5.1), no `etiqueta`.
    etiquetas: Array.isArray(d.etiquetas) ? d.etiquetas : [],
    rutaOriginal: d.storagePath ?? '',
    rutaMiniatura: d.thumbnailPath ?? null,
    capturadoEn: d.createdAtDevice?.toDate?.() ?? new Date(0),
    recibidoEn: d.createdAtServer?.toDate?.() ?? null,
    ubicacion: d.gps
      ? {
          latitud: d.gps.lat,
          longitud: d.gps.lng,
          precisionMetros: d.gps.accuracyM ?? 0,
          antiguedadMs: d.gps.ageMs ?? 0,
        }
      : null,
    ubicacionTexto: d.ubicacionTexto ?? null,
    comentario: d.comentario ?? null,
    bytes: d.sizeBytes ?? 0,
    duracionMs: d.durationMs ?? null,
    placas: d.placas ?? '',
    custodioUid: d.custodioUid ?? '',
    fechaLocal: d.fechaLocal ?? '',
  };
}

/** Los archivos de un viaje, para el expediente. */
export async function listarMediosDelViaje(viajeId: string): Promise<Medio[]> {
  const resultado = await getDocs(
    query(
      collection(firestore, 'medios'),
      where('reporteId', '==', viajeId),
      orderBy('createdAtDevice', 'asc'),
    ),
  );
  return resultado.docs.map((documento) => aMedio(documento.id, documento.data()));
}

/** Documentos por página en las lecturas por cursor (galería y reporte de unidad). */
const TAMANO_PAGINA = 500;

/** Tope de archivos por reporte de unidad. Acota las lecturas (y el costo) de una descarga. */
const TOPE_UNIDAD = 5000;

/** Tope de archivos que la galería carga de una vez cuando no se acota por periodo ni por
 *  número económico. Acota las lecturas de Firestore de una sola visita. */
const TOPE_GALERIA = 2000;

/** Archivos leídos de una consulta acotada, y si el tope dejó fuera archivos. */
export interface MediosDelPeriodo {
  medios: Medio[];
  /** `true` si hay más archivos que el tope: faltan los del extremo que la consulta lee al
   *  final (en la galería, los más antiguos; en el reporte de unidad, los más recientes). */
  recortado: boolean;
}

/**
 * Lista archivos ENTRE viajes, para la galería.
 *
 * La galería responde «todas las fotos de tal unidad en tal periodo»: a diferencia de
 * `listarMediosDelViaje`, que arma el expediente de un solo servicio, aquí se cruza todo
 * el corpus. El periodo (`fechaLocal`, la misma cadena `YYYY-MM-DD` que usa la pantalla de
 * Viajes, ver `lib/formato/fechas.ts`) y el número económico (`placas`, igualdad exacta
 * sobre el valor normalizado) acotan la lectura EN FIRESTORE.
 *
 * SIN ÍNDICES COMPUESTOS. Las dos formas de consulta que usa la galería sólo necesitan los
 * índices de un campo que Firestore crea solo; no dependen de que
 * `pf-infra-firebase/firestore.indexes.json` esté desplegado (una consulta con un índice
 * faltante falla entera, y la galería se queda sin nada):
 *  - Sin número económico: rango de `fechaLocal` ordenado por `fechaLocal` ↓. Lee los días
 *    más recientes primero, así que si se rebasa el tope se pierden los más antiguos.
 *  - Con número económico: sólo `placas ==`. Combinarlo con el rango de `fechaLocal` exigiría
 *    un índice compuesto, así que el periodo se aplica aquí mismo sobre los documentos de
 *    esa unidad. Es la lectura completa de la unidad, no de todo el corpus.
 * Dentro de la consulta el orden de los documentos de un mismo día no está definido, por eso
 * al final se ordena en memoria por captura descendente (lo más reciente primero).
 *
 * Se lee por páginas (`startAfter`) hasta agotar los resultados o el tope (`limite`, por
 * defecto `TOPE_GALERIA`). Se pide un documento de más para distinguir «justo el tope» de
 * «más que el tope». Los demás filtros de `FiltrosMedio` (`tipo`, `etiqueta`,
 * `custodioUid`) no se usan desde la galería y, combinados con el rango, sí piden índice
 * compuesto.
 */
export async function listarMedios(filtros: FiltrosMedio): Promise<MediosDelPeriodo> {
  const base: QueryConstraint[] = [];
  const desde = filtros.desde.trim();
  const hasta = filtros.hasta.trim();

  if (filtros.tipo) base.push(where('tipo', '==', filtros.tipo));
  // `etiquetas` es un array: la pertenencia se consulta con `array-contains`, no con `==`.
  if (filtros.etiqueta) base.push(where('etiquetas', 'array-contains', filtros.etiqueta));
  if (filtros.custodioUid) base.push(where('custodioUid', '==', filtros.custodioUid));

  if (filtros.placas) {
    base.push(where('placas', '==', filtros.placas));
  } else {
    if (desde) base.push(where('fechaLocal', '>=', desde));
    if (hasta) base.push(where('fechaLocal', '<=', hasta));
    base.push(orderBy('fechaLocal', 'desc'));
  }

  // Con número económico el periodo no viaja a Firestore.
  const enPeriodo = (medio: Medio): boolean =>
    !filtros.placas ||
    ((!desde || medio.fechaLocal >= desde) && (!hasta || medio.fechaLocal <= hasta));

  const tope = filtros.limite ?? TOPE_GALERIA;
  const leidos: Medio[] = [];
  let cursor: QueryDocumentSnapshot | undefined;

  while (leidos.length <= tope) {
    // Con número económico algunos documentos leídos se descartan por el periodo, así que
    // `leidos` no mide cuánto se ha consumido: se piden páginas completas para no terminar
    // leyendo de uno en uno al acercarse al tope.
    const tamano = filtros.placas
      ? TAMANO_PAGINA
      : Math.min(TAMANO_PAGINA, tope + 1 - leidos.length);
    const restricciones: QueryConstraint[] = [...base, limit(tamano)];
    if (cursor) restricciones.push(startAfter(cursor));

    const pagina = await getDocs(query(collection(firestore, 'medios'), ...restricciones));
    for (const documento of pagina.docs) {
      const medio = aMedio(documento.id, documento.data());
      if (enPeriodo(medio)) leidos.push(medio);
    }

    // Una página incompleta es la última.
    const ultimo = pagina.docs[pagina.docs.length - 1];
    if (pagina.docs.length < tamano || !ultimo) break;
    cursor = ultimo;
  }

  const recortado = leidos.length > tope;
  const dentroDelTope = recortado ? leidos.slice(0, tope) : leidos;

  // Enriquecer con nombres de custodios
  const medios = await enriquecerMediosConNombres(dentroDelTope);

  // Más reciente primero, con `id` de desempate para que el orden sea determinista. La
  // consulta no fija el orden dentro de un mismo día.
  medios.sort(
    (a, b) =>
      b.capturadoEn.getTime() - a.capturadoEn.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return { medios, recortado };
}

/**
 * Los archivos de UN custodio en un periodo, para el reporte de unidad.
 *
 * La consulta filtra en el servidor por `custodioUid` y por rango de `fechaLocal`, así que
 * sólo se leen los documentos de esa unidad, sin importar cuántos archivos tengan las
 * demás. Necesita el índice compuesto de `medios` (`custodioUid` ↑, `fechaLocal` ↑,
 * `createdAtDevice` ↓) que declara `pf-infra-firebase/firestore.indexes.json`. El orden de
 * la consulta debe coincidir EXACTAMENTE con el del índice.
 *
 * Se lee de lo más antiguo a lo más reciente, por páginas (`startAfter`). Si la unidad
 * rebasa `TOPE_UNIDAD`, se conservan los más antiguos y `recortado` queda en `true`.
 * Se pide un documento de más para distinguir «justo el tope» de «más que el tope».
 */
export async function listarMediosDeCustodioEnPeriodo(
  periodo: RangoFechas,
  custodioUid: string,
): Promise<MediosDelPeriodo> {
  const medios: Medio[] = [];
  let cursor: QueryDocumentSnapshot | undefined;

  while (medios.length <= TOPE_UNIDAD) {
    const pendientes = TOPE_UNIDAD + 1 - medios.length;
    const tamano = Math.min(TAMANO_PAGINA, pendientes);
    const restricciones: QueryConstraint[] = [
      where('custodioUid', '==', custodioUid),
      where('fechaLocal', '>=', periodo.desde),
      where('fechaLocal', '<=', periodo.hasta),
      orderBy('fechaLocal', 'asc'),
      orderBy('createdAtDevice', 'desc'),
      limit(tamano),
    ];
    if (cursor) restricciones.push(startAfter(cursor));

    const pagina = await getDocs(query(collection(firestore, 'medios'), ...restricciones));
    for (const documento of pagina.docs) medios.push(aMedio(documento.id, documento.data()));

    // Una página incompleta es la última: no quedan más documentos.
    const ultimo = pagina.docs[pagina.docs.length - 1];
    if (pagina.docs.length < tamano || !ultimo) break;
    cursor = ultimo;
  }

  const recortado = medios.length > TOPE_UNIDAD;
  return { medios: recortado ? medios.slice(0, TOPE_UNIDAD) : medios, recortado };
}

/**
 * URL del archivo a tamaño completo, para el visor.
 *
 * El visor SIEMPRE usa ésta, nunca la miniatura: la miniatura es de 320px y el valor
 * del panel es poder leer lo que hay dentro de la foto. Ver docs/PLAN.md §5.
 */
export function urlOriginal(medio: Medio): Promise<string> {
  return getDownloadURL(ref(storage, medio.rutaOriginal));
}

/** URL de la miniatura, sólo para rejillas y tiras de previsualización. */
export function urlMiniatura(medio: Medio): Promise<string> {
  return getDownloadURL(ref(storage, medio.rutaMiniatura ?? medio.rutaOriginal));
}
