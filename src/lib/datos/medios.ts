import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';

import { firestore, storage } from '@/lib/firebase/cliente';

import type { FiltrosMedio, Medio } from './tipos';

function aMedio(id: string, d: DocumentData): Medio {
  return {
    id,
    viajeId: d.reporteId ?? '',
    tipo: d.tipo ?? 'FOTO',
    etiqueta: d.etiqueta ?? '',
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
 */
export async function listarMedios(filtros: FiltrosMedio): Promise<Medio[]> {
  const restricciones: QueryConstraint[] = [
    where('fechaLocal', '>=', filtros.desde),
    where('fechaLocal', '<=', filtros.hasta),
  ];

  if (filtros.tipo) restricciones.push(where('tipo', '==', filtros.tipo));
  if (filtros.etiqueta) restricciones.push(where('etiqueta', '==', filtros.etiqueta));
  if (filtros.placas) restricciones.push(where('placas', '==', filtros.placas));
  if (filtros.custodioUid) restricciones.push(where('custodioUid', '==', filtros.custodioUid));

  restricciones.push(orderBy('createdAtDevice', 'desc'), limit(filtros.limite ?? 120));

  const resultado = await getDocs(query(collection(firestore, 'medios'), ...restricciones));
  return resultado.docs.map((documento) => aMedio(documento.id, documento.data()));
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
