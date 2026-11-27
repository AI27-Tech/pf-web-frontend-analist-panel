import { httpsCallable } from 'firebase/functions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  causaDeErrorRegistro,
  listarNumerosEconomicosFirebase,
  registrarEnvioFirebase,
} from './registroEnviosFirebase';
import type { DatosEnvio } from './reglasEnvio';

const DATOS: DatosEnvio = {
  shipmentId: '7001886000',
  lineaTransportista: 'Transportes del Norte',
  numeroEconomico: '042',
  bitacoraLegacyId: 'AB8398334',
};

/** Error con la forma que lanza el SDK al recibir un `HttpsError`. */
function errorCallable(codigo: string): Error {
  return Object.assign(new Error(codigo), { code: `functions/${codigo}` });
}

function simularCallable(implementacion: (datos?: unknown) => unknown) {
  const callable = vi.fn(implementacion);
  vi.mocked(httpsCallable).mockReturnValue(callable as never);
  return callable;
}

describe('causaDeErrorRegistro', () => {
  it.each([
    ['already-exists', 'duplicado'],
    ['failed-precondition', 'economico-desconocido'],
    ['invalid-argument', 'datos-invalidos'],
    ['permission-denied', 'sin-permiso'],
    ['unauthenticated', 'sin-permiso'],
    ['unavailable', 'sin-conexion'],
    ['deadline-exceeded', 'sin-conexion'],
    ['internal', 'sin-conexion'],
    ['not-found', 'desconocida'],
  ])('%s → %s', (codigo, causa) => {
    expect(causaDeErrorRegistro(errorCallable(codigo))).toBe(causa);
  });

  it('un error sin código es desconocido', () => {
    expect(causaDeErrorRegistro(new TypeError('x'))).toBe('desconocida');
    expect(causaDeErrorRegistro(undefined)).toBe('desconocida');
  });
});

describe('registrarEnvioFirebase', () => {
  beforeEach(() => {
    vi.mocked(httpsCallable).mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('llama a la función con los cuatro campos, el económico como texto y sin empresa', async () => {
    const callable = simularCallable(() => ({
      data: { shipmentId: DATOS.shipmentId, numeroEconomico: '042' },
    }));

    await registrarEnvioFirebase(DATOS);

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'registrarEnvio');
    expect(callable).toHaveBeenCalledWith(DATOS);
    const enviado = callable.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(enviado.numeroEconomico).toBe('042');
    expect(Object.keys(enviado).sort()).toEqual([
      'bitacoraLegacyId',
      'lineaTransportista',
      'numeroEconomico',
      'shipmentId',
    ]);
  });

  it('confirma con lo que devolvió el servidor', async () => {
    simularCallable(() => ({ data: { shipmentId: DATOS.shipmentId, numeroEconomico: 'AB042' } }));
    const resultado = await registrarEnvioFirebase(DATOS);
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.envio.numeroEconomico).toBe('AB042');
      expect(resultado.envio.shipmentId).toBe(DATOS.shipmentId);
    }
  });

  it('una respuesta que no corresponde al envío no es una confirmación', async () => {
    simularCallable(() => ({ data: {} }));
    expect(await registrarEnvioFirebase(DATOS)).toEqual({ ok: false, causa: 'desconocida' });

    simularCallable(() => ({ data: { shipmentId: '7001886001' } }));
    expect(await registrarEnvioFirebase(DATOS)).toEqual({ ok: false, causa: 'desconocida' });
  });

  it('distingue duplicado de error de conexión', async () => {
    simularCallable(() => {
      throw errorCallable('already-exists');
    });
    expect(await registrarEnvioFirebase(DATOS)).toEqual({ ok: false, causa: 'duplicado' });

    simularCallable(() => {
      throw errorCallable('unavailable');
    });
    expect(await registrarEnvioFirebase(DATOS)).toEqual({ ok: false, causa: 'sin-conexion' });
  });

  it('sin red según el navegador no llama a la función', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const callable = simularCallable(() => ({ data: {} }));
    expect(await registrarEnvioFirebase(DATOS)).toEqual({ ok: false, causa: 'sin-conexion' });
    expect(callable).not.toHaveBeenCalled();
  });
});

describe('listarNumerosEconomicosFirebase', () => {
  beforeEach(() => {
    vi.mocked(httpsCallable).mockReset();
  });

  it('devuelve la lista de la función, limpia', async () => {
    simularCallable(() => ({ data: { numerosEconomicos: ['042', '001', '042'] } }));
    expect(await listarNumerosEconomicosFirebase()).toEqual(['001', '042']);
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'listarNumerosEconomicos');
  });

  it('propaga el fallo para que la pantalla permita escribir a mano', async () => {
    simularCallable(() => {
      throw errorCallable('unavailable');
    });
    await expect(listarNumerosEconomicosFirebase()).rejects.toThrow();
  });
});
