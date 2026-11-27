import { describe, expect, it } from 'vitest';
import {
  limpiarNumerosEconomicos,
  normalizarBitacora,
  normalizarDatosEnvio,
  normalizarEconomico,
  normalizarShipmentId,
  validarEnvio,
  type DatosEnvio,
} from './reglasEnvio';

const VALIDO: DatosEnvio = {
  shipmentId: '7001886000',
  lineaTransportista: 'Transportes del Norte S.A. de C.V.',
  numeroEconomico: '042',
  bitacoraLegacyId: 'AB8398334',
};

describe('normalizarEconomico', () => {
  it('conserva el cero inicial: es texto, no número', () => {
    expect(normalizarEconomico('042')).toBe('042');
    expect(typeof normalizarEconomico('042')).toBe('string');
  });

  it('pone mayúsculas y quita todo lo que no sea letra o dígito (criterio de normalizarPlaca)', () => {
    expect(normalizarEconomico(' ab-12 3 ')).toBe('AB123');
    expect(normalizarEconomico('a.b/c_1')).toBe('ABC1');
  });

  it('conserva letras con acento y la eñe, como `isLetterOrDigit` en Echo', () => {
    expect(normalizarEconomico('ñu-7')).toBe('ÑU7');
  });

  it('un texto sin letras ni dígitos queda vacío', () => {
    expect(normalizarEconomico(' - . ')).toBe('');
  });
});

describe('normalizarShipmentId', () => {
  it('deja solo dígitos y corta en 10', () => {
    expect(normalizarShipmentId('70-018 86000999')).toBe('7001886000');
    expect(normalizarShipmentId('abc')).toBe('');
  });

  it('conserva ceros iniciales', () => {
    expect(normalizarShipmentId('0012345678')).toBe('0012345678');
  });
});

describe('normalizarBitacora', () => {
  it('pone mayúsculas, quita símbolos y corta en 9', () => {
    expect(normalizarBitacora('ab-8398334xx')).toBe('AB8398334');
  });
});

describe('validarEnvio', () => {
  it('acepta un envío completo', () => {
    expect(validarEnvio(VALIDO)).toEqual({});
  });

  it('pide los cuatro campos cuando están vacíos', () => {
    const errores = validarEnvio({
      shipmentId: '',
      lineaTransportista: '',
      numeroEconomico: '',
      bitacoraLegacyId: '',
    });
    expect(Object.keys(errores).sort()).toEqual([
      'bitacoraLegacyId',
      'lineaTransportista',
      'numeroEconomico',
      'shipmentId',
    ]);
  });

  it('el Shipment ID exige exactamente 10 dígitos', () => {
    expect(validarEnvio({ ...VALIDO, shipmentId: '700188600' }).shipmentId).toMatch(/10 dígitos/);
    expect(validarEnvio({ ...VALIDO, shipmentId: '70018860001' }).shipmentId).toBeDefined();
    expect(validarEnvio({ ...VALIDO, shipmentId: '70018860AB' }).shipmentId).toBeDefined();
  });

  it('la bitácora exige AB y 7 dígitos', () => {
    expect(
      validarEnvio({ ...VALIDO, bitacoraLegacyId: 'AB839833' }).bitacoraLegacyId,
    ).toBeDefined();
    expect(
      validarEnvio({ ...VALIDO, bitacoraLegacyId: 'XY8398334' }).bitacoraLegacyId,
    ).toBeDefined();
    expect(
      validarEnvio({ ...VALIDO, bitacoraLegacyId: 'AB83983AB' }).bitacoraLegacyId,
    ).toBeDefined();
    expect(
      validarEnvio({ ...VALIDO, bitacoraLegacyId: 'ab8398334' }).bitacoraLegacyId,
    ).toBeDefined();
  });

  it('una línea transportista de solo espacios no cuenta', () => {
    expect(validarEnvio({ ...VALIDO, lineaTransportista: '   ' }).lineaTransportista).toBeDefined();
  });

  it('un número económico sin letras ni dígitos no cuenta', () => {
    expect(validarEnvio({ ...VALIDO, numeroEconomico: '--' }).numeroEconomico).toBeDefined();
  });
});

describe('normalizarDatosEnvio', () => {
  it('manda el económico normalizado como texto y recorta la línea', () => {
    const resultado = normalizarDatosEnvio({
      ...VALIDO,
      lineaTransportista: '  Transportes   del Norte ',
      numeroEconomico: ' 042 ',
    });
    expect(resultado.numeroEconomico).toBe('042');
    expect(resultado.lineaTransportista).toBe('Transportes del Norte');
  });
});

describe('limpiarNumerosEconomicos', () => {
  it('normaliza, quita repetidos y ordena en orden natural', () => {
    expect(limpiarNumerosEconomicos(['042', '001', ' 42 ', '10', '2', '001'])).toEqual([
      '001',
      '2',
      '10',
      '042',
      '42',
    ]);
  });

  it('ignora lo que no sea texto y devuelve vacío si no es un arreglo', () => {
    expect(limpiarNumerosEconomicos(['001', 7, null, '', '--'])).toEqual(['001']);
    expect(limpiarNumerosEconomicos(undefined)).toEqual([]);
    expect(limpiarNumerosEconomicos({ numerosEconomicos: ['001'] })).toEqual([]);
  });
});
