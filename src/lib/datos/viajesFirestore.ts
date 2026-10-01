import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';

import { firestore } from '@/lib/firebase/cliente';

import { enriquecerConNombres } from './custodios';
import type { FiltrosViaje, Viaje, ViajesPage } from './tipos';

/**
 * Cursor opaco para paginación con Firestore.
 * En V1 se serializa como base64 del JSON del último documento.
 */
export type PaginationCursor = string | null;

/**
 * Conteo de fotos y audios de un viaje, respetando que `resumenMedios` es un SNAPSHOT
 * DE CIERRE.
 *
 * El productor computa `resumenMedios` (`{fotos, audios, durationMsTotal}`) al cerrar el
 * viaje; mientras el viaje está `ACTIVO` ese resumen queda en cero aunque ya haya medios
 * subidos —lo autoritativo en abierto es `mediosSubidos`..
 *
 * Por eso:
 *  - Cerrado/descartado (`ciclo != 'ACTIVO'`): `resumenMedios` es la fuente y separa
 *    fotos de audios.
 *  - Abierto (`ciclo == 'ACTIVO'`): no hay separación fiable por tipo, así que el total
 *    subido (`mediosSubidos`) se reporta como `fotos` —el tipo dominante de la evidencia—
 *    y `audios` queda en 0 hasta el cierre. Producto puede pedir un conteo en vivo de la
 *    colección `medios` si necesita el desglose real en abierto; se difiere.
 */
export function conteoDeMedios(d: DocumentData): { fotos: number; audios: number } {
  const activo = (d.ciclo ?? 'ACTIVO') === 'ACTIVO';
  if (activo) {
    return { fotos: d.mediosSubidos ?? 0, audios: 0 };
  }
  return {
    fotos: d.resumenMedios?.fotos ?? 0,
    audios: d.resumenMedios?.audios ?? 0,
  };
}

/** Traduce un documento de Firestore al tipo del panel. Es el único lugar que conoce
 *  los nombres de campo del contrato de la app.*/
function aViaje(id: string, d: DocumentData): Viaje {
  const { fotos, audios } = conteoDeMedios(d);
  return {
    id,
    placas: d.placas ?? '',
    // Contrato real (EMAIL_AUTH): el reporte trae `custodioCorreo`, no `custodioTelefono`.
    custodioCorreo: d.custodioCorreo ?? '',
    // El nombre no vive en el reporte, sino en `usuarios/{uid}.nombre`.
    custodioName: d.custodioName ?? undefined,
    custodioUid: d.custodioUid ?? '',
    fechaLocal: d.fechaLocal ?? '',
    abiertoEn: d.createdAtServer?.toDate?.() ?? d.createdAtDevice?.toDate?.() ?? new Date(0),
    cerradoEn: d.closedAt?.toDate?.() ?? null,
    comentario: d.comentario ?? null,
    isUpdated: d.hayNovedad === true,
    uploadedFiles: d.mediosSubidos ?? 0,
    ciclo: d.ciclo ?? 'ACTIVO',
    motivoDescarte: d.motivoDescarte ?? null,
    subida: d.subida ?? 'PENDIENTE',
    completo: d.completo === true,
    mediosEsperados: d.mediosEsperados ?? 0,
    estados: Array.isArray(d.estados) ? d.estados : [],
    etiquetas: d.etiquetas ?? [],
    fotos,
    audios,
  };
}

/**
 * Lista viajes para la pantalla principal, contra Firestore.
 *
 * Implementa paginación con cursor: el `cursor` del cliente es el punto de inicio
 * de la búsqueda (que siempre es el ÚLTIMO documento de la página anterior).
 * Se trae `pageSize + 1` para saber si hay más páginas; si se obtienen N+1 registros,
 * la página tiene N (completa) y existe la siguiente.
 *
 * El `total` se calcula haciendo una consulta separada con los mismos filtros y sin
 * limit, para obtener el conteo exacto que satisface los criterios.
 */
export async function listarViajesFirestore(
  filtros: FiltrosViaje,
  cursor?: PaginationCursor,
): Promise<ViajesPage> {
  const restricciones: QueryConstraint[] = [
    where('fechaLocal', '>=', filtros.desde),
    where('fechaLocal', '<=', filtros.hasta),
  ];

  if (filtros.placas) restricciones.push(where('placas', '==', filtros.placas));
  if (filtros.custodioUid) restricciones.push(where('custodioUid', '==', filtros.custodioUid));
  if (filtros.isUpdated !== undefined)
    restricciones.push(where('hayNovedad', '==', filtros.isUpdated));

  restricciones.push(orderBy('fechaLocal', 'desc'));

  // Calcular el total de viajes que satisfacen el filtro (sin limit)
  const totalQuery = query(collection(firestore, 'reportes'), ...restricciones);
  const totalDocs = await getDocs(totalQuery);
  const total = totalDocs.size;

  // Paginación con cursor
  const queryConstraints = [...restricciones];

  if (cursor) {
    // Deserializar el cursor (base64 del JSON del ID del último documento anterior)
    try {
      const cursorId = atob(cursor);
      const lastDocSnapshot = totalDocs.docs.find((doc) => doc.id === cursorId);
      if (lastDocSnapshot) {
        queryConstraints.push(startAfter(lastDocSnapshot));
      }
    } catch {
      // Cursor inválido, reiniciar desde el principio
      console.warn('Cursor inválido, reiniciando desde el principio');
    }
  }

  // Traer pageSize + 1 para saber si hay siguiente página
  queryConstraints.push(limit(filtros.pageSize + 1));

  const resultado = await getDocs(query(collection(firestore, 'reportes'), ...queryConstraints));
  const hasNextPage = resultado.docs.length > filtros.pageSize;
  const pageViajesArray = resultado.docs.slice(0, filtros.pageSize);

  const viajes = pageViajesArray.map((documento) => aViaje(documento.id, documento.data()));
  const enriquecidos = await enriquecerConNombres(viajes);

  // Generar cursor para la siguiente página
  let nextCursor: PaginationCursor = null;
  if (hasNextPage && pageViajesArray.length > 0) {
    const lastDoc = pageViajesArray[pageViajesArray.length - 1];
    if (lastDoc) {
      nextCursor = btoa(lastDoc.id);
    }
  }

  return {
    viajes: enriquecidos,
    total,
    nextCursor,
  };
}

export async function obtenerViajeFirestore(id: string): Promise<Viaje | null> {
  const documento = await getDoc(doc(firestore, 'reportes', id));
  if (!documento.exists()) return null;
  const viaje = aViaje(documento.id, documento.data());
  const [enriquecido] = await enriquecerConNombres([viaje]);
  return enriquecido ?? viaje;
}
