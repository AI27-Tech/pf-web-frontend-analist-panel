import { describe, expect, it } from 'vitest';

import { formatearTelefono } from './telefono';

describe('formatearTelefono', () => {
  it('agrupa un E.164 mexicano como +XX (XXX) XXX XXXX', () => {
    expect(formatearTelefono('+525563322805')).toBe('+52 (556) 332 2805');
  });

  it('ignora separadores ya presentes en el valor', () => {
    expect(formatearTelefono('+52 55 6332 2805')).toBe('+52 (556) 332 2805');
  });

  it('devuelve la cadena vacía para valores vacíos o nulos', () => {
    expect(formatearTelefono('')).toBe('');
    expect(formatearTelefono(null)).toBe('');
    expect(formatearTelefono(undefined)).toBe('');
  });

  it('respeta un valor sin prefijo + (no parece E.164)', () => {
    expect(formatearTelefono('5563322805')).toBe('5563322805');
  });

  it('respeta un E.164 de longitud atípica sin mutilarlo', () => {
    expect(formatearTelefono('+1 202 555 0173')).toBe('+1 202 555 0173');
  });
});
