/**
 * Perfil de acceso del panel y matriz de secciones por rol.
 *
 * CONTRATO CON 01 (roles-y-perfiles): el perfil vive en `perfiles/{correo}`, con el
 * correo normalizado a minúsculas, y trae `rol` y `clienteId`. `clienteId` es
 * obligatorio para CLIENTE e ignorado para ANALISTA y CHECKLIST. La autorización real
 * vive en las reglas de Firestore y Storage; esta matriz sólo decide qué se pinta, a
 * dónde se puede navegar y qué consultas se acotan.
 *
 * Este módulo es parte de la frontera `lib/datos/`: es de los pocos lugares del repo
 * que importan el SDK de Firebase (lo impone la regla de ESLint).
 */

import { doc, getDoc } from 'firebase/firestore';

import { firestore } from '@/lib/firebase/cliente';

import { esperarSesion } from './sesion';

export type RolPanel = 'ANALISTA' | 'CLIENTE' | 'CHECKLIST';

export interface PerfilPanel {
  rol: RolPanel;
  /** Empresa cuyos datos puede leer el Cliente. `null` para los roles internos. */
  clienteId: string | null;
}

/** Rutas de primer nivel que el panel sabe pintar. */
export type SeccionPanel =
  '/viajes' | '/galeria' | '/reporte' | '/sistema' | '/administracion' | '/ajustes' | '/envios';

/** Matriz de secciones por rol. Es la misma que usan la guarda, el menú y el destino
 *  inicial: una sola fuente para que no se desincronicen. */
const SECCIONES: Record<RolPanel, readonly SeccionPanel[]> = {
  ANALISTA: ['/viajes', '/galeria', '/reporte', '/sistema', '/administracion', '/ajustes'],
  CLIENTE: ['/viajes', '/galeria', '/reporte', '/ajustes'],
  CHECKLIST: ['/envios'],
};

/** Primera sección que ve cada rol al iniciar sesión. */
export const RUTA_INICIAL: Record<RolPanel, SeccionPanel> = {
  ANALISTA: '/viajes',
  CLIENTE: '/viajes',
  CHECKLIST: '/envios',
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
 * Traduce el documento de perfil a la vista del panel. Un rol desconocido o un Cliente
 * sin empresa no son un perfil válido: no se cae a un rol por omisión.
 */
export function perfilDesdeDocumento(
  datos: Record<string, unknown> | undefined,
): PerfilPanel | null {
  if (!datos) return null;
  const rol = datos.rol;
  if (rol !== 'ANALISTA' && rol !== 'CLIENTE' && rol !== 'CHECKLIST') return null;
  if (rol === 'CLIENTE') {
    const clienteId = typeof datos.clienteId === 'string' ? datos.clienteId.trim() : '';
    return clienteId ? { rol, clienteId } : null;
  }
  return { rol, clienteId: null };
}

/** El perfil de la sesión actual, o `null` si la cuenta no tiene uno válido. */
export function cargarPerfil(): Promise<PerfilPanel | null> {
  return esperarSesion().then((usuario) => {
    if (!usuario) return null;
    // El perfil no cambia durante una sesión; se cachea por uid para no repetir la
    // lectura en cada consulta. Un usuario distinto vuelve a leer.
    if (cache?.uid === usuario.uid) return cache.perfil;
    const perfil = leerPerfil(usuario.email);
    cache = { uid: usuario.uid, perfil };
    return perfil;
  });
}

let cache: { uid: string; perfil: Promise<PerfilPanel | null> } | null = null;

async function leerPerfil(correo: string | null): Promise<PerfilPanel | null> {
  if (!correo) return null;
  try {
    const documento = await getDoc(doc(firestore, 'perfiles', correo.trim().toLowerCase()));
    return documento.exists() ? perfilDesdeDocumento(documento.data()) : null;
  } catch {
    // Sin perfil legible no hay acceso. Un fallo de red tampoco abre la puerta: las
    // reglas vuelven a negar cada lectura.
    return null;
  }
}

/**
 * Empresa cuyos datos puede leer la sesión. `null` significa lectura global (Analista).
 * Lanza si el rol no lee datos del panel o si no hay perfil válido: quien consulte debe
 * haber pasado antes por la guarda de `_privado`.
 */
export async function alcanceLectura(): Promise<string | null> {
  const perfil = await cargarPerfil();
  if (!perfil) throw new Error('La cuenta no tiene un perfil de panel válido.');
  if (perfil.rol === 'CHECKLIST') throw new Error('El rol Checklist no lee datos del panel.');
  return perfil.clienteId;
}
