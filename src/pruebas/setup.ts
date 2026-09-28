import '@testing-library/jest-dom/vitest';

// Mockear Firebase globalmente para todos los tests
import './firebase.mock';

// jsdom no implementa ResizeObserver, y los componentes de @ai27-tech/ui que miden su
// propio tamaño (p. ej. el badge con truncado/tooltip del ImageCarousel) lo instancian
// al montar. Sin este polyfill, esos componentes lanzan "ResizeObserver is not defined"
// en el entorno de pruebas. Es un stub inerte: no observa nada, sólo evita el crash.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
