import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';

import { firestore } from '@/lib/firebase/cliente';

import { enriquecerConNombres } from './custodios';
import type { FiltrosViaje, Viaje, ViajesPage } from './tipos';
import { queryViajes } from './viajesQuery';

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
 * Sólo el RANGO DE FECHAS se resuelve en Firestore (es el recorte grande y es el único
 * criterio por el que la colección está indexada de forma barata). El resto de los
 * filtros —coincidencia parcial de `placas`, coincidencia parcial de `custodioName`,
 * pertenencia de `etiqueta`, `isUpdated`—, el orden, el `total` y el corte de la página
 * se aplican EN MEMORIA con la MISMA función pura `queryViajes` que usa el mock.
 *
 * Antes esta función hacía su propia consulta divergente: `placas` por igualdad exacta
 * (así que una placa parcial no devolvía nada), nunca aplicaba `custodioName` ni
 * `etiqueta` (los filtros de Unidad y Etiqueta no hacían nada en producción) y devolvía
 * `total = página`, que rompía la paginación. Reusar `queryViajes` hace que la pantalla
 * se comporte igual contra Firestore que contra el mock, con una sola fuente de verdad.
 *
 * Nota: el filtrado por fecha ya recorta el universo; `queryViajes` opera sobre esa
 * ventana. Si una ventana de fechas creciera más allá de lo razonable, el recorte
 * tendría que paginarse en servidor, pero eso excede el alcance V1 (lectura acotada por
 * periodo).
 */
export async function listarViajesFirestore(filtros: FiltrosViaje): Promise<ViajesPage> {
  const restricciones: QueryConstraint[] = [
    where('fechaLocal', '>=', filtros.desde),
    where('fechaLocal', '<=', filtros.hasta),
    orderBy('fechaLocal', 'desc'),
  ];

  const resultado = await getDocs(query(collection(firestore, 'reportes'), ...restricciones));
  const viajes = resultado.docs.map((documento) => aViaje(documento.id, documento.data()));

  const enriquecidos = await enriquecerConNombres(viajes);

  // `queryViajes` reaplica el rango de fechas (inocuo, ya está dentro) y resuelve el resto
  // de filtros, el orden y la paginación con `total` correcto.
  return queryViajes(enriquecidos, filtros);
}

export async function obtenerViajeFirestore(id: string): Promise<Viaje | null> {
  const documento = await getDoc(doc(firestore, 'reportes', id));
  if (!documento.exists()) return null;
  const viaje = aViaje(documento.id, documento.data());
  const [enriquecido] = await enriquecerConNombres([viaje]);
  return enriquecido ?? viaje;
}
