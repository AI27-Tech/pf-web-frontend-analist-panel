/**
 * Lectura y escritura reales del reporte por Shipment ID, contra Firestore.
 *
 * Las lecturas sólo aplican igualdades en Firestore; el orden y el filtro de descartados
 * se resuelven en memoria en `envios.ts`, igual que en las consultas existentes del
 * panel. Los índices que necesita el Cliente (`reportes` y `medios` por `clienteId` +
 * igualdad) los entrega la issue 02 en `pf-infra-firebase/firestore.indexes.json`.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { firestore } from '@/lib/firebase/cliente';

import { cargarPerfil, alcanceLectura } from './accesoPanel';
import { aMedio } from './medios';
import { esperarSesion } from './sesion';
import type { Envio, Medio, ReporteVinculado, ResultadoCorreccion, VistaEnvio } from './tipos';
import { TOPE_ENVIO, construirVistaEnvio, evaluarCorreccion } from './envios';

/** Documentos por página en la lectura de medios por lotes. */
const TAMANO_PAGINA = 500;

/** Reportes por lote en la consulta `reporteId in [...]`. */
const TAMANO_LOTE = 30;

function aEnvio(id: string, d: DocumentData): Envio {
  return {
    shipmentId: id,
    clienteId: d.clienteId ?? '',
    numeroEconomico: d.numeroEconomico ?? '',
    lineaTransportista: d.lineaTransportista ?? '',
    bitacoraLegacyId: d.bitacoraLegacyId ?? '',
    createdAtServer: d.createdAtServer?.toDate?.() ?? null,
    vigente: d.vigente === true,
  };
}

function aReporteVinculado(id: string, d: DocumentData): ReporteVinculado {
  return {
    id,
    ciclo: d.ciclo ?? 'ACTIVO',
    fechaLocal: d.fechaLocal ?? '',
    placas: d.placas ?? '',
    custodioCorreo: d.custodioCorreo ?? '',
    abiertoEn: d.createdAtServer?.toDate?.() ?? d.createdAtDevice?.toDate?.() ?? new Date(0),
  };
}

/**
 * Vista completa de un envío: cabecera, seguimientos y medios, con el tope de lectura.
 *
 * `null` cuando el envío no existe o, para el Cliente, cuando es de otra empresa: la
 * pantalla responde igual en ambos casos para no revelar que el envío existe.
 */
export async function obtenerVistaEnvioFirestore(shipmentId: string): Promise<VistaEnvio | null> {
  const clienteId = await alcanceLectura();
  const envioDoc = await getDoc(doc(firestore, 'envios', shipmentId));
  if (!envioDoc.exists()) return null;
  const datosEnvio = envioDoc.data();
  // Defensa en profundidad: las reglas ya niegan el documento ajeno, pero un entorno sin
  // reglas no debe revelarlo.
  if (clienteId !== null && datosEnvio.clienteId !== clienteId) return null;

  const reportesSnap = await getDocs(
    query(
      collection(firestore, 'reportes'),
      ...(clienteId !== null ? [where('clienteId', '==', clienteId)] : []),
      where('shipmentId', '==', shipmentId),
    ),
  );
  const reportes = reportesSnap.docs.map((documento) =>
    aReporteVinculado(documento.id, documento.data()),
  );

  // Medios de todos los reportes del envío, en lotes de `reporteId in [...]` de 30 y con
  // paginación interna, hasta `TOPE_ENVIO`.
  const medios: Medio[] = [];
  const ids = reportes.map((reporte) => reporte.id);
  for (let inicio = 0; inicio < ids.length && medios.length <= TOPE_ENVIO; inicio += TAMANO_LOTE) {
    const lote = ids.slice(inicio, inicio + TAMANO_LOTE);
    let cursor: QueryDocumentSnapshot | undefined;
    while (medios.length <= TOPE_ENVIO) {
      const restricciones: QueryConstraint[] = [
        ...(clienteId !== null ? [where('clienteId', '==', clienteId)] : []),
        where('reporteId', 'in', lote),
        limit(TAMANO_PAGINA),
      ];
      if (cursor) restricciones.push(startAfter(cursor));
      const pagina = await getDocs(query(collection(firestore, 'medios'), ...restricciones));
      for (const documento of pagina.docs) {
        if (medios.length >= TOPE_ENVIO) break;
        medios.push(aMedio(documento.id, documento.data()));
      }
      const ultimo = pagina.docs[pagina.docs.length - 1];
      if (pagina.docs.length < TAMANO_PAGINA || !ultimo) break;
      cursor = ultimo;
    }
  }

  const recortado = medios.length >= TOPE_ENVIO;
  return construirVistaEnvio(aEnvio(envioDoc.id, datosEnvio), reportes, medios, recortado);
}

/**
 * Corre el vínculo de un seguimiento (sólo Analista). Escribe los cinco campos de la
 * auditoría y nada más. La AUTORIZACIÓN real es la regla de 01 que permite al Analista
 * actualizar exactamente esos campos (pendiente en esa issue); aquí se pre-checa el
 * destino para dar el mensaje, no como sustituto de la regla.
 */
export async function corregirVinculacionFirestore(opciones: {
  reporteId: string;
  shipmentId: string | null;
}): Promise<ResultadoCorreccion> {
  const usuario = await esperarSesion();
  if (!usuario) return { ok: false, mensaje: 'No hay una sesión iniciada.' };
  const perfil = await cargarPerfil();
  if (!perfil || perfil.rol !== 'analista') {
    return { ok: false, mensaje: 'Solo un Analista puede corregir el vínculo.' };
  }

  const reporteRef = doc(firestore, 'reportes', opciones.reporteId);
  const reporteSnap = await getDoc(reporteRef);
  if (!reporteSnap.exists()) return { ok: false, mensaje: 'El seguimiento no existe.' };
  const datos = reporteSnap.data();

  const destino = (opciones.shipmentId ?? '').trim() || null;
  const envioSnap = destino !== null ? await getDoc(doc(firestore, 'envios', destino)) : null;
  const decision = evaluarCorreccion({
    vinculacionActual: (datos.vinculacion ?? null) as string | null,
    shipmentIdActual: (datos.shipmentId ?? null) as string | null,
    destino,
    envioDestino: envioSnap?.exists()
      ? { clienteId: String(envioSnap.data()?.clienteId ?? '') }
      : null,
    clienteReporte: String(datos.clienteId ?? ''),
  });
  if (!decision.ok || !decision.cambio) return decision;

  await updateDoc(reporteRef, {
    shipmentId: destino,
    vinculacion: destino === null ? 'SIN_ENVIO' : 'VINCULADO',
    vinculacionOrigen: 'MANUAL',
    vinculacionActualizadaPor: usuario.uid,
    vinculacionActualizadaEn: serverTimestamp(),
  });
  return decision;
}
