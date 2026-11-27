/**
 * Alta de envíos (Echo 06): dominio y conmutador de fuente de datos.
 *
 * Las pantallas piden `registrarEnvio` y `listarNumerosEconomicos`; no saben si detrás hay
 * el callable real (`registroEnviosFirebase.ts`) o la simulación de desarrollo
 * (`registroEnviosMock.ts`, con `VITE_DATOS_MOCK=true`). Las reglas de formato viven en
 * `reglasEnvio.ts`.
 */
import { listarNumerosEconomicosFirebase, registrarEnvioFirebase } from './registroEnviosFirebase';
import { listarNumerosEconomicosMock, registrarEnvioMock } from './registroEnviosMock';
import { normalizarDatosEnvio, validarEnvio, type DatosEnvio } from './reglasEnvio';

export type { DatosEnvio } from './reglasEnvio';

const usarMock = import.meta.env.VITE_DATOS_MOCK === 'true';

/** Un envío que la función confirmó como persistido. */
export interface EnvioRegistrado extends DatosEnvio {
  /** Momento en que el panel recibió la confirmación. */
  registradoEn: Date;
}

/**
 * Por qué no se registró el envío. En todos los casos el alta NO se hizo (o, en
 * `sin-conexion`, no se pudo confirmar) y la captura del formulario debe conservarse.
 */
export type CausaFalloRegistro =
  /** Ya existe un envío con ese Shipment ID. No se modificó. */
  | 'duplicado'
  /** El número económico no tiene reportes en la empresa. */
  | 'economico-desconocido'
  /** El servidor rechazó el formato de algún campo. */
  | 'datos-invalidos'
  /** La cuenta no puede dar de alta envíos (sin rol Checklist, inactiva o sin sesión). */
  | 'sin-permiso'
  /** No se llegó al servidor o no respondió. No se sabe si el alta quedó persistida. */
  | 'sin-conexion'
  /** Cualquier otra falla, incluida una respuesta que no confirma el alta. */
  | 'desconocida';

export type ResultadoRegistro =
  { ok: true; envio: EnvioRegistrado } | { ok: false; causa: CausaFalloRegistro };

/**
 * Registra un envío. Nunca lanza: devuelve el resultado para que la pantalla distinga
 * éxito, duplicado y error de conexión. `ok: true` solo si la función confirmó el alta.
 *
 * Manda el número económico como texto normalizado (`042` conserva su cero) y no manda la
 * empresa: la función la toma del perfil del usuario autenticado.
 */
export async function registrarEnvio(datos: DatosEnvio): Promise<ResultadoRegistro> {
  const canonicos = normalizarDatosEnvio(datos);
  if (Object.keys(validarEnvio(canonicos)).length > 0) {
    return { ok: false, causa: 'datos-invalidos' };
  }
  return usarMock ? registrarEnvioMock(canonicos) : registrarEnvioFirebase(canonicos);
}

/** Números económicos de la empresa con reportes recientes. Lanza si no se pueden leer. */
export function listarNumerosEconomicos(): Promise<string[]> {
  return usarMock ? listarNumerosEconomicosMock() : listarNumerosEconomicosFirebase();
}
