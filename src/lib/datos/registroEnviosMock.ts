/**
 * SOLO DESARROLLO (`VITE_DATOS_MOCK=true`): simula las respuestas acordadas con 02 mientras
 * las funciones reales no estén desplegadas. Se borra junto con el resto de los mocks.
 *
 * Reproduce lo que importa para la pantalla:
 * - el alta confirma tras una pausa corta;
 * - un Shipment ID repetido responde `duplicado` y NO cambia el envío ya registrado;
 * - sin red (`navigator.onLine === false`, p. ej. «Offline» en las herramientas del
 *   navegador) responde `sin-conexion`.
 *
 * No valida que el número económico exista en reportes: esa regla es de la función real.
 */
import { limpiarNumerosEconomicos, normalizarEconomico, type DatosEnvio } from './reglasEnvio';
import type { ResultadoRegistro } from './registroEnvios';

/** Respuesta simulada de `listarNumerosEconomicos()`. */
const NUMEROS_ECONOMICOS = ['001', '037', '042'];

/** Envíos «persistidos» durante esta sesión del navegador, por Shipment ID. */
const registrados = new Map<string, DatosEnvio>();

const PAUSA_MS = 600;

function pausa(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function hayRed(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export async function listarNumerosEconomicosMock(): Promise<string[]> {
  await pausa(PAUSA_MS / 2);
  if (!hayRed()) throw new Error('Sin conexión');
  return limpiarNumerosEconomicos(NUMEROS_ECONOMICOS);
}

export async function registrarEnvioMock(datos: DatosEnvio): Promise<ResultadoRegistro> {
  await pausa(PAUSA_MS);
  if (!hayRed()) return { ok: false, causa: 'sin-conexion' };
  if (registrados.has(datos.shipmentId)) return { ok: false, causa: 'duplicado' };
  const persistido = { ...datos, numeroEconomico: normalizarEconomico(datos.numeroEconomico) };
  registrados.set(datos.shipmentId, persistido);
  return { ok: true, envio: { ...persistido, registradoEn: new Date() } };
}

/** Vacía los envíos simulados. Solo para pruebas. */
export function reiniciarRegistroMock(): void {
  registrados.clear();
}
