import { describe, expect, it } from 'vitest';

import { fechaLocalDe, rangoDeAtajo } from './fechas';

describe('fechaLocalDe', () => {
  it('formatea como YYYY-MM-DD', () => {
    expect(fechaLocalDe(new Date('2026-09-21T18:00:00Z'))).toBe('2026-09-21');
  });

  it('usa la zona de México, no UTC', () => {
    // 03:00 UTC del día 21 son las 21:00 del día 20 en la Ciudad de México. Si esto
    // devolviera el día 21, un viaje de la noche caería en el reporte del día siguiente.
    expect(fechaLocalDe(new Date('2026-09-21T03:00:00Z'))).toBe('2026-09-20');
  });
});

describe('rangoDeAtajo', () => {
  // Lunes 21 de septiembre de 2026, media tarde en México.
  const lunes = new Date('2026-09-21T18:00:00Z');

  it('hoy abre y cierra en el mismo día', () => {
    expect(rangoDeAtajo('hoy', lunes)).toEqual({ desde: '2026-09-21', hasta: '2026-09-21' });
  });

  it('semana arranca el lunes de la semana en curso', () => {
    const jueves = new Date('2026-09-24T18:00:00Z');
    expect(rangoDeAtajo('semana', jueves)).toEqual({ desde: '2026-09-21', hasta: '2026-09-24' });
  });

  it('en lunes, semana empieza ese mismo día', () => {
    expect(rangoDeAtajo('semana', lunes)).toEqual({ desde: '2026-09-21', hasta: '2026-09-21' });
  });

  it('en domingo, semana sigue arrancando el lunes anterior', () => {
    const domingo = new Date('2026-09-27T18:00:00Z');
    expect(rangoDeAtajo('semana', domingo)).toEqual({ desde: '2026-09-21', hasta: '2026-09-27' });
  });

  it('mes arranca el día primero', () => {
    expect(rangoDeAtajo('mes', lunes)).toEqual({ desde: '2026-09-01', hasta: '2026-09-21' });
  });

  it('cruza el cambio de mes sin salirse', () => {
    const primeroDeOctubre = new Date('2026-10-01T18:00:00Z');
    expect(rangoDeAtajo('mes', primeroDeOctubre)).toEqual({
      desde: '2026-10-01',
      hasta: '2026-10-01',
    });
  });
});
