import { collection, getDocs, orderBy, query, where, type DocumentData } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';

import { firestore, storage } from '@/lib/firebase/cliente';

import type { Medio } from './tipos';

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
