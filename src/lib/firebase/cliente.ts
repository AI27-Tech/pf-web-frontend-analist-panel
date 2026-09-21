import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type User } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

/**
 * Inicialización del SDK web de Firebase.
 *
 * Éste y `src/lib/datos/` son los ÚNICOS lugares del repo que importan `firebase/*`;
 * una regla de ESLint lo impone. Ver docs/PLAN.md §2 y §4.
 *
 * La `apiKey` no es un secreto: identifica el proyecto, no autoriza nada. Lo que
 * protege los datos son las reglas de Firestore y Storage.
 */
const configuracion = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps()[0] ?? initializeApp(configuracion);

export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

if (import.meta.env.VITE_USAR_EMULADORES === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

/**
 * Resuelve el usuario de la sesión en cuanto Firebase Auth termina de restaurarla.
 *
 * `auth.currentUser` es `null` durante los primeros milisegundos aunque haya sesión
 * persistida, así que un guard que lo lea directo manda al login a un usuario que sí
 * estaba autenticado. Esto espera el primer evento y luego se da de baja.
 */
export function esperarSesionFirebase(): Promise<User | null> {
  return new Promise((resolver) => {
    // Si Firebase no puede restaurar la sesión —config de desarrollo ficticia, o el
    // emulador no está corriendo— se resuelve como "sin sesión" en lugar de propagar
    // el error. Así el guard manda al login y la UI se puede ver, en vez de dejar la
    // pantalla en blanco. En un entorno bien configurado esta rama no se ejecuta.
    let baja: (() => void) | undefined;
    try {
      baja = auth.onAuthStateChanged(
        (usuario) => {
          baja?.();
          resolver(usuario);
        },
        () => {
          baja?.();
          resolver(null);
        },
      );
    } catch {
      resolver(null);
    }
  });
}
