/// <reference types="vite/client" />

/** Variables de entorno del panel. Tipar `import.meta.env` evita que una variable mal
 *  escrita pase silenciosamente como `undefined` hasta tiempo de ejecución. */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_USAR_EMULADORES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
