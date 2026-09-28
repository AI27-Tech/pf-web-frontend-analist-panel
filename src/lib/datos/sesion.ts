import { FirebaseError } from 'firebase/app';
import {
  confirmPasswordReset,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
  verifyPasswordResetCode,
} from 'firebase/auth';

import { auth, esperarSesionFirebase, observarSesionFirebase } from '@/lib/firebase/cliente';

export type ResultadoSesion = { ok: true } | { ok: false; mensaje: string };

/**
 * Resultado genérico de una operación que puede fallar.
 */
export type ResultadoOperacion = { ok: true } | { ok: false; mensaje: string };

/**
 * Resultado de validar un código de reset: contiene el email si es válido.
 */
export type ResultadoValidacion = { ok: true; email: string } | { ok: false; mensaje: string };

/**
 * Resuelve la sesión actual en cuanto Firebase Auth termina de restaurarla.
 *
 * Se reexporta desde aquí, y no desde `lib/firebase/`, porque las pantallas sólo
 * conocen `lib/datos/`. Es la misma frontera que impone la regla de ESLint.
 */
export function esperarSesion(): Promise<User | null> {
  return esperarSesionFirebase();
}

/**
 * Vista de la sesión que consumen las pantallas. Expone sólo lo que la UI necesita, en
 * lugar de filtrar el tipo `User` del SDK a través de la frontera de `lib/datos/`.
 */
export type UsuarioSesion = {
  readonly nombre: string;
  readonly correo: string | null;
};

/** Proyecta el `User` del SDK a la vista mínima que usa la UI. El nombre a mostrar es el
 *  `displayName`, si no el correo, y si no un genérico. */
function aUsuarioSesion(usuario: User): UsuarioSesion {
  return {
    nombre: usuario.displayName ?? usuario.email ?? 'Usuario',
    correo: usuario.email,
  };
}

/**
 * Observa la sesión en vivo. Se reexpone desde aquí, y no desde `lib/firebase/`, porque
 * las pantallas sólo conocen `lib/datos/`. Invoca `escucha` con la vista del usuario
 * actual (o `null` sin sesión) y devuelve la función para darse de baja.
 */
export function observarSesion(escucha: (usuario: UsuarioSesion | null) => void): () => void {
  return observarSesionFirebase((usuario) => {
    escucha(usuario ? aUsuarioSesion(usuario) : null);
  });
}

/** Mensajes en español para los códigos de error de Firebase Auth. Los del SDK vienen
 *  en inglés y con forma de código, que no sirve mostrar a un usuario. */
function mensajeDeError(codigo: string): string {
  switch (codigo) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.';
    case 'auth/invalid-email':
      return 'El correo no tiene un formato válido.';
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu red e inténtalo de nuevo.';
    case 'auth/invalid-action-code':
      return 'El enlace de reset es inválido o ha expirado.';
    case 'auth/expired-action-code':
      return 'El enlace de reset ha expirado. Solicita uno nuevo.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 8 caracteres.';
    default:
      return 'No se pudo completar la operación. Inténtalo de nuevo.';
  }
}

export async function iniciarSesion(correo: string, contrasena: string): Promise<ResultadoSesion> {
  try {
    await signInWithEmailAndPassword(auth, correo, contrasena);
    return { ok: true };
  } catch (error) {
    const codigo = error instanceof FirebaseError ? error.code : '';
    return { ok: false, mensaje: mensajeDeError(codigo) };
  }
}

export function cerrarSesion(): Promise<void> {
  return signOut(auth);
}

/**
 * Envía un email de recuperación de contraseña al correo indicado.
 * Firebase genera un código de reset y lo incluye en el link del email.
 */
export async function enviarEmailDeReset(correo: string): Promise<ResultadoOperacion> {
  try {
    await sendPasswordResetEmail(auth, correo);
    return { ok: true };
  } catch (error) {
    const codigo = error instanceof FirebaseError ? error.code : '';
    return { ok: false, mensaje: mensajeDeError(codigo) };
  }
}

/**
 * Valida que un código de reset sea válido y no haya expirado.
 * Devuelve el email asociado al código si es válido.
 */
export async function validarCodigoDeReset(codigo: string): Promise<ResultadoValidacion> {
  try {
    const email = await verifyPasswordResetCode(auth, codigo);
    return { ok: true, email };
  } catch (error) {
    const codigo_error = error instanceof FirebaseError ? error.code : '';
    return { ok: false, mensaje: mensajeDeError(codigo_error) };
  }
}

/**
 * Confirma el reset de contraseña con un código válido y una nueva contraseña.
 * El código debe haber sido validado previamente con `validarCodigoDeReset()`.
 */
export async function confirmReset(
  codigo: string,
  nuevaContrasena: string,
): Promise<ResultadoOperacion> {
  try {
    await confirmPasswordReset(auth, codigo, nuevaContrasena);
    return { ok: true };
  } catch (error) {
    const codigo_error = error instanceof FirebaseError ? error.code : '';
    return { ok: false, mensaje: mensajeDeError(codigo_error) };
  }
}
