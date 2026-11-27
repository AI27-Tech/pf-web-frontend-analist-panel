import { describe, expect, it } from 'vitest';

import { totalesDeEnvio } from './envios';
import { listarEnviosMock, obtenerVistaEnvioMock } from './enviosMock';

describe('enviosMock (datos de desarrollo)', () => {
  it('S-100 muestra 2 seguimientos y 4 validaciones, sin contar el descartado', async () => {
    const vista = await obtenerVistaEnvioMock('S-100');

    expect(vista).not.toBeNull();
    expect(totalesDeEnvio(vista!.seguimientos)).toEqual({ seguimientos: 2, validaciones: 4 });
  });

  it('un Shipment ID inexistente responde null', async () => {
    expect(await obtenerVistaEnvioMock('S-999')).toBeNull();
  });

  it('lista los envíos de la empresa del más reciente al más antiguo', () => {
    expect(listarEnviosMock('Colgate').map((e) => e.shipmentId)).toEqual([
      'S-103',
      'S-101',
      'S-100',
    ]);
  });

  it('el Analista lista todos los envíos, incluida otra empresa', () => {
    expect(listarEnviosMock(null).map((e) => e.shipmentId)).toContain('S-200');
  });
});
