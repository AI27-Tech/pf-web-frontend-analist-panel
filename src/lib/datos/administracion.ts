// Lógica de dominio para administración del sistema (gestión de custodios, etc).
//
// Abstracción entre las pantallas y el acceso bajo-nivel a Firestore.
// Las features importan desde aquí, nunca directamente desde firebase/.

import {
  actualizarSolicitudesEnTiempoReal,
  crearSolicitudCustodioFirebase,
  esperarResolucionSolicitudFirebase,
  type SolicitudCustodioFirebase,
} from '@/lib/firebase/administracion';

/**
 * Interfaz de dominio para una solicitud de creación de custodio.
 * Reutiliza directamente el tipo de Firebase (pueden extenderse después).
 */
export type SolicitudCustodio = SolicitudCustodioFirebase;

/**
 * Crea una solicitud de custodio nuevo.
 *
 * Valida localmente antes de enviar a Firestore:
 * - ID de unidad: formato válido (alfanumérico, 1-20 caracteres)
 * - Teléfono: formato E.164 (+52...)
 *
 * Genera automáticamente:
 * - Correo: `{idUnidad}@ai27.com` (minúsculas)
 * - Contraseña: `Bravo-{idUnidad}-ai27`
 * - Nombre: `{idUnidad}` (mayúsculas)
 *
 * @throws Error si la validación falla
 */
export async function crearSolicitudCustodio(datos: {
  idUnidad: string;
  telefono: string;
}): Promise<string> {
  // Validaciones locales
  if (!datos.idUnidad || !datos.idUnidad.trim()) {
    throw new Error('El ID de unidad es obligatorio');
  }

  const idUnidadLimpio = datos.idUnidad.trim();

  // Validar formato: B + 4 dígitos exactamente
  if (!/^B\d{4}$/.test(idUnidadLimpio)) {
    throw new Error('El ID de unidad debe ser B seguido de 4 dígitos (ej: B2688)');
  }

  if (!datos.telefono || !datos.telefono.trim()) {
    throw new Error('El teléfono es obligatorio');
  }

  const telefonoLimpio = datos.telefono.trim();

  // Validar formato E.164: +52 seguido de 10 dígitos
  if (!/^\+52\d{10}$/.test(telefonoLimpio)) {
    throw new Error('El teléfono debe ser +52 seguido de 10 dígitos');
  }

  // Generar correo y contraseña según el patrón del CSV de provisión
  // (custodios.example.csv): correo `b<num>@ai27.com`, contraseña `Bravo-<num>-ai27`.
  // El correo lleva la 'b'; la contraseña lleva SOLO el número, sin la 'b'.
  const idUnidadMinuscula = idUnidadLimpio.toLowerCase();
  const numero = idUnidadMinuscula.replace(/^b/, ''); // quita la 'b' inicial
  const correo = `${idUnidadMinuscula}@ai27.com`;
  const contrasena = `Bravo-${numero}-ai27`;
  const nombre = idUnidadLimpio.toUpperCase();

  // Enviar a Firestore (delegada a layer de Firebase)
  const id = await crearSolicitudCustodioFirebase({
    correo,
    contrasena,
    nombre,
    telefono: telefonoLimpio,
  });

  return id;
}

/**
 * Escucha cambios en las solicitudes de custodios del analista actual.
 * Retorna un callback de desuscripción.
 */
export function escucharSolicitudesCustodios(
  callback: (solicitudes: SolicitudCustodio[]) => void,
): () => void {
  // Delegada a layer de Firebase; las transformaciones ocurren allá
  return actualizarSolicitudesEnTiempoReal(
    callback as (solicitudes: SolicitudCustodioFirebase[]) => void,
  );
}

/**
 * Resultado de la resolución de una solicitud.
 */
export type ResultadoSolicitud = { ok: true; mensaje: string } | { ok: false; mensaje: string };

/**
 * Crea una solicitud de custodio y ESPERA a que la Cloud Function la resuelva.
 *
 * Devuelve cuando el estado cambia a COMPLETADO (ok) o ERROR (falla).
 * Si pasa el timeout sin resolverse, devuelve un error de timeout.
 *
 * @throws Error si la validación local falla (antes de crear la solicitud)
 */
export async function crearCustodioYEsperar(
  datos: { idUnidad: string; telefono: string },
  timeoutMs = 30000,
): Promise<ResultadoSolicitud> {
  // Crea la solicitud (valida localmente y lanza si algo está mal)
  const id = await crearSolicitudCustodio(datos);

  // Espera la resolución escuchando ese documento
  return esperarResolucionSolicitudFirebase(id, timeoutMs);
}
