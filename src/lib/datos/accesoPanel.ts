/**
 * Perfil de acceso del panel y matriz de secciones por rol.
 *
 * CONTRATO CON 01 (roles-y-perfiles): el perfil vive en `acceso_panel/{correo}`, con el
 * correo en minúsculas como id del documento, y trae `rol` (`analista` | `cliente` |
 * `checklist`), `clienteId` y `activo`. `clienteId` es obligatorio para `cliente` y
 * `checklist`; `activo` es obligatorio y `false` revoca el acceso sin borrar el perfil.
 * La autorización real vive en las reglas de Firestore y Storage; esta matriz sólo decide
 * qué se pinta, a dónde se puede navegar y qué consultas se acotan.
 *
 * El perfil se escucha con `onSnapshot` para que una baja surta efecto durante la sesión.
 *
 * Este módulo es parte de la frontera `lib/datos/`: es de los pocos lugares del repo
 * que importan el SDK de Firebase (lo impone la regla de ESLint).
 */

import { doc, onSnapshot } from 'firebase/firestore';

import { firestore } from '@/lib/firebase/cliente';

import { esperarSesion } from './sesion';

export type RolPanel = 'analista' | 'cliente' | 'checklist';

export interface PerfilPanel {
  rol: RolPanel;
  /** Empresa cuyos datos puede leer la cuenta. `null` sólo para el Analista. */
  clienteId: string | null;
}

/** Rutas de primer nivel que el panel sabe pintar. */
export type SeccionPanel =
  '/viajes' | '/galeria' | '/reporte' | '/sistema' | '/administracion' | '/ajustes' | '/envios';

/** Matriz de secciones por rol. Es la misma que usan la guarda, el menú y el destino
 *  inicial: una sola fuente para que no se desincronicen. */
const SECCIONES: Record<RolPanel, readonly SeccionPanel[]> = {
  analista: ['/viajes', '/galeria', '/reporte', '/sistema', '/administracion', '/ajustes'],
  cliente: ['/viajes', '/galeria', '/reporte', '/ajustes'],
  checklist: ['/envios', '/ajustes'],
};

/** Primera sección que ve cada rol al iniciar sesión. */
export const RUTA_INICIAL: Record<RolPanel, SeccionPanel> = {
  analista: '/viajes',
  cliente: '/viajes',
  checklist: '/envios',
};

export function seccionesDe(perfil: PerfilPanel): readonly SeccionPanel[] {
  return SECCIONES[perfil.rol];
}

/** `true` si la ruta es una sección del rol o una subruta suya (`/viajes/abc`). */
export function puedeAcceder(perfil: PerfilPanel, ruta: string): boolean {
  return SECCIONES[perfil.rol].some(
    (seccion) => ruta === seccion || ruta.startsWith(`${seccion}/`),
  );
}

/**
 * Traduce el documento de perfil a la vista del panel. Un rol desconocido, un perfil sin
 * `activo: true` o un rol con empresa que no la declara no son un perfil válido: no se
 * cae a un rol por omisión.
 *
 * `clienteId` se usa tal cual, sin normalizar: es el mismo texto que trae
 * `reportes.clienteId`. Sólo se rechaza el valor vacío.
 */
export function perfilDesdeDocumento(
  datos: Record<string, unknown> | undefined,
): PerfilPanel | null {
  if (!datos) return null;
  if (datos.activo !== true) return null;
  const rol = datos.rol;
  if (rol !== 'analista' && rol !== 'cliente' && rol !== 'checklist') return null;
  if (rol === 'analista') return { rol, clienteId: null };
  const clienteId = typeof datos.clienteId === 'string' ? datos.clienteId : '';
  return clienteId.trim() ? { rol, clienteId } : null;
}

const COLECCION = 'acceso_panel';

interface EstadoPerfil {
  uid: string;
  perfil: PerfilPanel | null;
  listo: Promise<PerfilPanel | null>;
  observadores: Set<(perfil: PerfilPanel | null) => void>;
  desuscribir: () => void;
}

let estado: EstadoPerfil | null = null;

/** El perfil de la sesión actual, o `null` si la cuenta no tiene uno válido. */
export function cargarPerfil(): Promise<PerfilPanel | null> {
  return esperarSesion().then((usuario) => {
    if (!usuario) {
      cerrarPerfil();
      return null;
    }
    if (estado?.uid === usuario.uid) return estado.listo;
    cerrarPerfil();
    estado = escucharPerfil(usuario.uid, usuario.email);
    return estado.listo;
  });
}

/**
 * Observa el perfil mientras dure la sesión. Invoca de inmediato con el valor actual y en
 * cada cambio; `null` significa que la cuenta perdió el acceso. Devuelve la baja.
 *
 * Se llama después de la guarda, así que el primer valor ya está resuelto.
 */
export function observarPerfil(escucha: (perfil: PerfilPanel | null) => void): () => void {
  const actual = estado;
  if (!actual) return () => {};
  actual.observadores.add(escucha);
  escucha(actual.perfil);
  return () => {
    actual.observadores.delete(escucha);
  };
}

function escucharPerfil(uid: string, correo: string | null): EstadoPerfil {
  let resolver: (perfil: PerfilPanel | null) => void = () => {};
  const listo = new Promise<PerfilPanel | null>((resolverPromesa) => {
    resolver = resolverPromesa;
  });
  const nuevo: EstadoPerfil = {
    uid,
    perfil: null,
    listo,
    observadores: new Set(),
    desuscribir: () => {},
  };
  if (!correo) {
    resolver(null);
    return nuevo;
  }
  const emitir = (perfil: PerfilPanel | null) => {
    nuevo.perfil = perfil;
    resolver(perfil);
    for (const escucha of nuevo.observadores) escucha(perfil);
  };
  nuevo.desuscribir = onSnapshot(
    doc(firestore, COLECCION, correo.trim().toLowerCase()),
    (documento) => emitir(documento.exists() ? perfilDesdeDocumento(documento.data()) : null),
    // Sin perfil legible no hay acceso. Un fallo de red tampoco abre la puerta: las
    // reglas vuelven a negar cada lectura.
    () => emitir(null),
  );
  return nuevo;
}

function cerrarPerfil() {
  estado?.desuscribir();
  estado = null;
}

/**
 * Empresa cuyos datos puede leer la sesión. `null` significa lectura global (Analista).
 * Lanza si el rol no lee datos del panel o si no hay perfil válido: quien consulte debe
 * haber pasado antes por la guarda de `_privado`.
 */
export async function alcanceLectura(): Promise<string | null> {
  await cargarPerfil();
  // Se lee el estado vivo, no la promesa: una baja a media sesión debe cerrar también
  // las consultas siguientes.
  const perfil = estado?.perfil ?? null;
  if (!perfil) throw new Error('La cuenta no tiene un perfil de panel válido.');
  if (perfil.rol === 'checklist') throw new Error('El rol Checklist no lee datos del panel.');
  return perfil.clienteId;
}
