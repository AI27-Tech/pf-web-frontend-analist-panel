import { FirebaseError } from 'firebase/app';

/**
 * NOTA: Este módulo está definido pero no se usa en rutas en V1.
 * Se conserva para uso futuro cuando las rutas implemente manejo centralizado de errores.
 * Actualmente solo se prueba en errores.test.ts.
 *
 * Categorización de errores de datos en términos de negocio y operación.
 * Permite que las pantallas distingan entre fallos de autorización, índices faltantes,
 * conectividad y otros, mostrando mensajes útiles sin exponer códigos del SDK.
 */
export type CausaErrorDatos =
  | 'sin-permiso' // permission-denied: el correo falta en config/analistas
  | 'indice-faltante' // failed-precondition: índice compuesto no desplegado
  | 'sin-conexion' // unavailable: red inaccesible, backend caído
  | 'desconocida'; // cualquier otro código

/**
 * Error de dominio que encapsula un error de Firestore o Storage con su causa clasificada.
 * Permite que el código de UI maneje errores sin acoplarse al SDK.
 */
export class ErrorDatos extends Error {
  readonly causa: CausaErrorDatos;
  readonly original: unknown;

  constructor(causa: CausaErrorDatos, original: unknown) {
    super(mensajeDeErrorDatos(causa));
    this.name = 'ErrorDatos';
    this.causa = causa;
    this.original = original;
  }
}

/**
 * Mapea un error de Firebase a su causa de dominio.
 * Si el error no es un FirebaseError, devuelve 'desconocida'.
 */
export function aErrorDatos(error: unknown): ErrorDatos {
  if (error instanceof FirebaseError) {
    let causa: CausaErrorDatos;
    switch (error.code) {
      case 'permission-denied':
        causa = 'sin-permiso';
        break;
      case 'failed-precondition':
        causa = 'indice-faltante';
        break;
      case 'unavailable':
        causa = 'sin-conexion';
        break;
      default:
        causa = 'desconocida';
    }
    return new ErrorDatos(causa, error);
  }
  return new ErrorDatos('desconocida', error);
}

/**
 * Texto de error en español adecuado para mostrar al analista.
 * Cada causa tiene un mensaje que explica qué hacer o a quién contactar.
 */
export function mensajeDeErrorDatos(causa: CausaErrorDatos): string {
  switch (causa) {
    case 'sin-permiso':
      return (
        'Esta cuenta no tiene acceso a la evidencia. ' +
        'Falta dar de alta el correo en config/analistas.correos del proyecto de Firebase. ' +
        'Contacta al administrador.'
      );
    case 'indice-faltante':
      return (
        'La consulta necesita un índice que no está desplegado. ' +
        'Avisa a quien administre pf-infra-firebase.'
      );
    case 'sin-conexion':
      return (
        'No hay conexión con el servidor. ' + 'Verifica tu conexión a internet y vuelve a intentar.'
      );
    case 'desconocida':
      return (
        'Error desconocido al cargar datos. ' +
        'Intenta de nuevo o contacta al soporte si el problema persiste.'
      );
  }
}
