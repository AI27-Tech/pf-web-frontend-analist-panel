import { describe, expect, it } from 'vitest';

import { etiquetaVisible } from './tipos';

describe('etiquetaVisible', () => {
  it('devuelve la primera etiqueta del array', () => {
    expect(etiquetaVisible({ etiquetas: ['sin-novedad', 'candado'] })).toBe('sin-novedad');
  });

  it('cae a «Sin etiqueta» cuando el array está vacío', () => {
    expect(etiquetaVisible({ etiquetas: [] })).toBe('Sin etiqueta');
  });
});
