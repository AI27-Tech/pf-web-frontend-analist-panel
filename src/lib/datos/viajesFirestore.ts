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

import { enriquecerConNombres } from './custodios';
import type { FiltrosViaje, Viaje, ViajesPage } from './tipos';

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
    // Contrato real: el reporte trae `custodioTelefono` (E.164), no `custodioCorreo`.
    custodioTelefono: d.custodioTelefono ?? '',
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
    estados: [],
    etiquetas: d.etiquetas ?? [],
    fotos,
    audios,
  };
}

/**
 * Lista viajes para la pantalla principal, contra Firestore.
 */
export async function listarViajesFirestore(filtros: FiltrosViaje): Promise<ViajesPage> {
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
  const viajes = resultado.docs.map((documento) => aViaje(documento.id, documento.data()));

  const enriquecidos = await enriquecerConNombres(viajes);

  return {
    viajes: enriquecidos,
    total: enriquecidos.length,
  };
}

export async function obtenerViajeFirestore(id: string): Promise<Viaje | null> {
  const documento = await getDoc(doc(firestore, 'reportes', id));
  if (!documento.exists()) return null;
  const viaje = aViaje(documento.id, documento.data());
  const [enriquecido] = await enriquecerConNombres([viaje]);
  return enriquecido ?? viaje;
}
