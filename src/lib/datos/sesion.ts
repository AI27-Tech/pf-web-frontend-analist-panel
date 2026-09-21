import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';

import { auth, esperarSesionFirebase } from '@/lib/firebase/cliente';

export type ResultadoSesion = { ok: true } | { ok: false; mensaje: string };

/**
 * Resuelve la sesión actual en cuanto Firebase Auth termina de restaurarla.
 *
 * Se reexporta desde aquí, y no desde `lib/firebase/`, porque las pantallas sólo
 * conocen `lib/datos/`. Es la misma frontera que impone la regla de ESLint.
 */
export function esperarSesion(): Promise<User | null> {
  return esperarSesionFirebase();
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
    default:
      return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
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
