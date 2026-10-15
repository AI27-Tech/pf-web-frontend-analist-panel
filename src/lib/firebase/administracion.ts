// Acceso bajo-nivel a Firestore para administración (gestión de custodios).
//
// REGLA DE ORO: Solo funciones de este archivo pueden importar firebase/* directamente.
// Las features y datos nunca importan el SDK de Firebase; siempre usan src/lib/datos/.

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { auth, firestore, observarSesionFirebase } from './cliente';

/**
 * Interfaz de solicitud de custodio (espejo del tipo de datos).
 * Se define aquí para evitar dependencia circular con administracion.ts de datos.
 */
export interface SolicitudCustodioFirebase {
  id: string;
  correo: string;
  nombre: string;
  telefono: string;
  estado: 'PENDIENTE' | 'COMPLETADO' | 'ERROR';
  solicitadoEn: Date;
  procesadoEn?: Date;
  error?: string;
  resultado?: {
    uid: string;
    correo: string;
    cuenta_creada: boolean;
  };
}

/**
 * Crea una solicitud de custodio en Firestore.
 *
 * @param datos Correo, contraseña, nombre y teléfono del custodio a crear
 * @returns El ID del documento de la solicitud
 */
export async function crearSolicitudCustodioFirebase(datos: {
  correo: string;
  contrasena: string;
  nombre: string;
  telefono: string | null;
}): Promise<string> {
  // Obtener el UID del usuario actual
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Usuario no autenticado');
  }

  // Crear el documento de solicitud
  const ref = await addDoc(collection(firestore, 'solicitudes_custodios'), {
    correo: datos.correo,
    contrasena: datos.contrasena,
    nombre: datos.nombre,
    telefono: datos.telefono,
    estado: 'PENDIENTE',
    solicitadoPor: uid,
    solicitadoEn: serverTimestamp(),
    procesadoEn: null,
    resultado: null,
    error: null,
  });

  return ref.id;
}

/**
 * Escucha cambios en las solicitudes del analista actual.
 * Retorna una función de desuscripción.
 */
export function actualizarSolicitudesEnTiempoReal(
  callback: (solicitudes: SolicitudCustodioFirebase[]) => void,
): () => void {
  let unsubScribe: (() => void) | undefined;

  // Observar el usuario actual
  const unsubUsuario = observarSesionFirebase((usuario) => {
    // Desuscribirse de la query anterior si existe
    unsubScribe?.();

    if (!usuario?.uid) {
      callback([]);
      return;
    }

    // Crear query: solicitudes del usuario, ordenadas por fecha reciente, límite 50
    const q = query(
      collection(firestore, 'solicitudes_custodios'),
      where('solicitadoPor', '==', usuario.uid),
      orderBy('solicitadoEn', 'desc'),
      limit(50),
    );

    // Escuchar cambios
    unsubScribe = onSnapshot(q, (snap) => {
      const solicitudes = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          correo: data.correo || '',
          nombre: data.nombre || '',
          telefono: data.telefono || '',
          estado: data.estado || 'PENDIENTE',
          solicitadoEn:
            data.solicitadoEn instanceof Timestamp ? data.solicitadoEn.toDate() : new Date(),
          procesadoEn:
            data.procesadoEn instanceof Timestamp ? data.procesadoEn.toDate() : undefined,
          error: data.error || undefined,
          resultado: data.resultado || undefined,
        } as SolicitudCustodioFirebase;
      });

      callback(solicitudes);
    });
  });

  // Retornar función que desuscribe ambos
  return () => {
    unsubScribe?.();
    unsubUsuario();
  };
}

/**
 * Escucha un documento de solicitud específico hasta que su estado se resuelva
 * (COMPLETADO o ERROR), o hasta que se agote el timeout.
 */
export function esperarResolucionSolicitudFirebase(
  docId: string,
  timeoutMs: number,
): Promise<{ ok: true; mensaje: string } | { ok: false; mensaje: string }> {
  return new Promise((resolve) => {
    let resuelto = false;

    // Timeout: si la Cloud Function no resuelve a tiempo
    const timer = setTimeout(() => {
      if (!resuelto) {
        resuelto = true;
        unsub();
        resolve({
          ok: false,
          mensaje:
            'La solicitud sigue en proceso. Revisa la lista de solicitudes para ver el resultado.',
        });
      }
    }, timeoutMs);

    // Escuchar el documento específico
    const unsub = onSnapshot(doc(firestore, 'solicitudes_custodios', docId), (snap) => {
      if (!snap.exists() || resuelto) return;

      const data = snap.data();
      const estado = data.estado;

      if (estado === 'COMPLETADO') {
        resuelto = true;
        clearTimeout(timer);
        unsub();
        resolve({
          ok: true,
          mensaje: `Custodio ${data.nombre || data.correo} creado correctamente.`,
        });
      } else if (estado === 'ERROR') {
        resuelto = true;
        clearTimeout(timer);
        unsub();
        resolve({
          ok: false,
          mensaje: data.error || 'Error al crear el custodio.',
        });
      }
      // Si sigue PENDIENTE, seguimos esperando
    });
  });
}
