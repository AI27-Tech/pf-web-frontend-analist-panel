/**
 * Mock global de Firebase para testing.
 *
 * Mockea los módulos de Firebase para que los tests no intenten conectar
 * a servidores reales. Se importa en setup.ts y se aplica globalmente.
 */
import { vi } from 'vitest';

/**
 * Mock de FirebaseError para tests
 */
export class MockFirebaseError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'FirebaseError';
    this.code = code;
  }
}

/**
 * Mockear módulos de Firebase App
 */
vi.mock('firebase/app', () => {
  return {
    initializeApp: vi.fn(() => ({
      name: '[DEFAULT]',
      automaticDataCollectionEnabled: false,
    })),
    getApps: vi.fn(() => [
      {
        name: '[DEFAULT]',
        automaticDataCollectionEnabled: false,
      },
    ]),
    FirebaseError: MockFirebaseError,
  };
});

/**
 * Mockear módulos de Firebase Auth
 */
vi.mock('firebase/auth', () => {
  return {
    getAuth: vi.fn(() => ({
      currentUser: null,
      onAuthStateChanged: vi.fn((callback: (user: null) => void) => {
        callback(null);
        return () => {};
      }),
    })),
    connectAuthEmulator: vi.fn(),
    onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: null) => void) => {
      callback(null);
      return () => {};
    }),
  };
});

/**
 * Mockear módulos de Firebase Firestore
 */
vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(() => ({
      type: 'firestore-mock',
    })),
    connectFirestoreEmulator: vi.fn(),
  };
});

/**
 * Mockear módulos de Firebase Storage
 */
vi.mock('firebase/storage', () => {
  return {
    getStorage: vi.fn(() => ({
      type: 'storage-mock',
    })),
    connectStorageEmulator: vi.fn(),
  };
});
