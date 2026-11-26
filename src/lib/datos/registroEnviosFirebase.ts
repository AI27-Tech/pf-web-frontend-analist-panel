/**
 * Alta de envíos contra las Cloud Functions callables de `pf-infra-firebase` (Echo 02).
 *
 * Es el primer callable del panel. La autorización la resuelve la función con
 * `request.auth`: toma el perfil `acceso_panel/{correo}`, exige rol `checklist` y
 * `activo: true`, y saca el `clienteId` del perfil. Por eso aquí NO se envía la empresa.
 *
 * Contrato con 02, implementado en `pf-infra-firebase` (`functions/envios-callables.js`, rama
 * `feat/alta-de-envios`). La firma de `listarNumerosEconomicos` la confirmó Producto:
 *
 * - `listarNumerosEconomicos()` → `{ numerosEconomicos: string[] }`
 * - `registrarEnvio(DatosEnvio)` → `{ ok, shipmentId, numeroEconomico }` (este último, ya
 *   normalizado por el servidor). Solo responde con éxito cuando el alta quedó persistida.
 *
 * Errores del alta (códigos de `HttpsError`; el cliente los recibe como `functions/<código>`):
 *
 * | Código                | Significado                                         |
 * | --------------------- | --------------------------------------------------- |
 * | `already-exists`      | Shipment ID duplicado. No se modificó el existente. |
 * | `failed-precondition` | El económico no tiene reportes en la empresa.       |
 * | `invalid-argument`    | Formato inválido de algún campo.                    |
 * | `permission-denied`   | Perfil sin rol Checklist o inactivo.                |
 * | `unauthenticated`     | Sin sesión.                                         |
 *
 * La tabla vive en `CAUSA_POR_CODIGO`: si 02 elige otros códigos, es lo único que cambia.
 */
import { httpsCallable } from 'firebase/functions';
import { funciones } from '@/lib/firebase/cliente';
import { limpiarNumerosEconomicos, type DatosEnvio } from './reglasEnvio';
import type { CausaFalloRegistro, ResultadoRegistro } from './registroEnvios';

const FUNCION_ALTA = 'registrarEnvio';
const FUNCION_LISTA = 'listarNumerosEconomicos';

/** Código de error del callable → causa de dominio. Lo que no está aquí es `desconocida`. */
const CAUSA_POR_CODIGO: Record<string, CausaFalloRegistro> = {
  'functions/already-exists': 'duplicado',
  'functions/failed-precondition': 'economico-desconocido',
  'functions/invalid-argument': 'datos-invalidos',
  'functions/permission-denied': 'sin-permiso',
  'functions/unauthenticated': 'sin-permiso',
  // El SDK reporta como `internal` un `fetch` que falló (red caída, sin DNS, CORS) y
  // también un error 500 del servidor. Para quien captura es lo mismo: no se registró y
  // puede reintentar.
  'functions/unavailable': 'sin-conexion',
  'functions/deadline-exceeded': 'sin-conexion',
  'functions/internal': 'sin-conexion',
};

/** Traduce el error de un callable a la causa con la que la pantalla decide qué decir. */
export function causaDeErrorRegistro(error: unknown): CausaFalloRegistro {
  // Por forma y no con `instanceof FirebaseError`: no depende de qué copia del SDK
  // lanzó el error.
  const codigo =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  return CAUSA_POR_CODIGO[codigo] ?? 'desconocida';
}

/** Hay red según el navegador. Evita esperar el tiempo de espera del SDK sin conexión. */
function hayRed(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/**
 * Registra el envío. Solo devuelve `ok: true` si la función confirma el alta y la
 * respuesta corresponde al Shipment ID enviado: una respuesta vacía o de otro envío no es
 * una confirmación.
 */
export async function registrarEnvioFirebase(datos: DatosEnvio): Promise<ResultadoRegistro> {
  if (!hayRed()) return { ok: false, causa: 'sin-conexion' };
  try {
    const alta = httpsCallable<DatosEnvio, { shipmentId?: unknown; numeroEconomico?: unknown }>(
      funciones,
      FUNCION_ALTA,
    );
    const { data } = await alta(datos);
    if (data?.shipmentId !== datos.shipmentId) return { ok: false, causa: 'desconocida' };
    return {
      ok: true,
      envio: {
        ...datos,
        // El servidor es quien normaliza el económico: se muestra lo que quedó guardado.
        numeroEconomico:
          typeof data.numeroEconomico === 'string' && data.numeroEconomico !== ''
            ? data.numeroEconomico
            : datos.numeroEconomico,
        registradoEn: new Date(),
      },
    };
  } catch (error) {
    return { ok: false, causa: causaDeErrorRegistro(error) };
  }
}

/** Números económicos de la empresa con reportes recientes. Lanza si la función falla. */
export async function listarNumerosEconomicosFirebase(): Promise<string[]> {
  const lista = httpsCallable<void, { numerosEconomicos?: unknown }>(funciones, FUNCION_LISTA);
  const { data } = await lista();
  return limpiarNumerosEconomicos(data?.numerosEconomicos);
}
