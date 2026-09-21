import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';

import { firestore } from '@/lib/firebase/cliente';

import type { FiltrosViaje, Viaje } from './tipos';

/** Traduce un documento de Firestore al tipo del panel. Es el único lugar que conoce
 *  los nombres de campo del contrato de la app. */
function aViaje(id: string, d: DocumentData): Viaje {
  return {
    id,
    placas: d.placas ?? '',
    custodioCorreo: d.custodioCorreo ?? '',
    // El catálogo de custodios no existe: si el documento no trae nombre, queda
    // undefined y el renglón cae al correo.
    custodioName: d.custodioName ?? undefined,
    custodioUid: d.custodioUid ?? '',
    fechaLocal: d.fechaLocal ?? '',
    abiertoEn: d.createdAtServer?.toDate?.() ?? d.createdAtDevice?.toDate?.() ?? new Date(0),
    cerradoEn: d.closedAt?.toDate?.() ?? null,
    comentario: d.comentario ?? null,
    isUpdated: d.hayNovedad === true,
    ciclo: d.ciclo ?? 'ACTIVO',
    motivoDescarte: d.motivoDescarte ?? null,
    subida: d.subida ?? 'PENDIENTE',
    completo: d.completo === true,
    mediosEsperados: d.mediosEsperados ?? 0,
    uploadedFiles: d.mediosSubidos ?? 0,
    estados: [],
    etiquetas: d.etiquetas ?? [],
    fotos: d.resumenMedios?.fotos ?? 0,
    audios: d.resumenMedios?.audios ?? 0,
  };
}

/**
 * Lista viajes para la pantalla principal.
 *
 * Se filtra por `fechaLocal`, la cadena `YYYY-MM-DD` que la app escribe en zona de
 * México. Ordenar y acotar rangos sobre esa cadena evita depender de la zona horaria
 * de quien consulta, que es para lo que existe ese campo.
 */
export async function listarViajes(filtros: FiltrosViaje): Promise<Viaje[]> {
  const restricciones: QueryConstraint[] = [
    where('fechaLocal', '>=', filtros.desde),
    where('fechaLocal', '<=', filtros.hasta),
  ];

  if (filtros.placas) restricciones.push(where('placas', '==', filtros.placas));
  if (filtros.custodioUid) restricciones.push(where('custodioUid', '==', filtros.custodioUid));
  if (filtros.isUpdated !== undefined)
    restricciones.push(where('hayNovedad', '==', filtros.isUpdated));

  restricciones.push(orderBy('fechaLocal', 'desc'), limit(filtros.pageSize));

  const resultado = await getDocs(query(collection(firestore, 'reportes'), ...restricciones));
  return resultado.docs.map((documento) => aViaje(documento.id, documento.data()));
}

export async function obtenerViaje(id: string): Promise<Viaje | null> {
  const documento = await getDoc(doc(firestore, 'reportes', id));
  return documento.exists() ? aViaje(documento.id, documento.data()) : null;
}
