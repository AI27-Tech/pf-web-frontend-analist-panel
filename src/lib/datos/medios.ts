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

/**
 * Lista archivos ENTRE viajes, para la galería.
 *
 * La galería responde «todas las fotos de tal etiqueta en tal periodo»: a diferencia de
 * `listarMediosDelViaje`, que arma el expediente de un solo servicio, aquí se cruza todo
 * el corpus acotado por fecha. Se filtra por `fechaLocal`, la misma cadena `YYYY-MM-DD`
 * que usa la pantalla de Viajes, para que ambas compartan el rango sin depender de la
 * zona horaria de quien consulta (ver `lib/formato/fechas.ts`).
 *
 * El orden es por captura descendente: lo más reciente primero, que es como el analista
 * revisa el día.
 *
 * NOTA: La consulta original usaba orderBy('createdAtDevice', 'desc') con múltiples
 * filtros de rango, lo que exige un índice compuesto de Firestore. Para desarrollo,
 * ordenamos en memoria. Ver:
 * https://console.firebase.google.com/v1/r/project/custodio-906e7268/firestore/indexes
 */
export async function listarMedios(filtros: FiltrosMedio): Promise<Medio[]> {
  const restricciones: QueryConstraint[] = [];

  // Solo agregar filtro de fecha si los valores no están vacíos
  if (filtros.desde && filtros.desde.trim() !== '') {
    restricciones.push(where('fechaLocal', '>=', filtros.desde));
  }
  if (filtros.hasta && filtros.hasta.trim() !== '') {
    restricciones.push(where('fechaLocal', '<=', filtros.hasta));
  }

  if (filtros.tipo) restricciones.push(where('tipo', '==', filtros.tipo));
  // `etiquetas` es un array: la pertenencia se consulta con `array-contains`, no con `==`.
  if (filtros.etiqueta) restricciones.push(where('etiquetas', 'array-contains', filtros.etiqueta));
  if (filtros.placas) restricciones.push(where('placas', '==', filtros.placas));
  if (filtros.custodioUid) restricciones.push(where('custodioUid', '==', filtros.custodioUid));

  // Sin orderBy en la consulta (evita exigir índice). Ordenamos en memoria en el cliente.
  restricciones.push(limit(filtros.limite ?? 120));

  const resultado = await getDocs(query(collection(firestore, 'medios'), ...restricciones));
  let medios = resultado.docs.map((documento) => aMedio(documento.id, documento.data()));

  // Enriquecer con nombres de custodios
  medios = await enriquecerMediosConNombres(medios);

  // Ordenar en cliente por createdAtDevice descendente (más reciente primero)
  return medios.sort((a, b) => {
    const timeA = a.capturadoEn.getTime();
    const timeB = b.capturadoEn.getTime();
    return timeB - timeA; // Descendente
  });
}

/** Documentos por página en la lectura del reporte de unidad. */
const TAMANO_PAGINA = 500;

/** Tope de archivos por reporte de unidad. Acota las lecturas (y el costo) de una descarga. */
const TOPE_UNIDAD = 5000;

/** Archivos de un custodio en un periodo, y si se descartaron los más recientes por el tope. */
export interface MediosDelPeriodo {
  medios: Medio[];
  /** `true` si la unidad tiene más archivos que el tope: faltan los más recientes. */
  recortado: boolean;
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
