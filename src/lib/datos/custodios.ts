/**
 * Directorio de custodios: resuelve el NOMBRE visible del custodio a partir de su `uid`.
 *
 * El reporte no trae el nombre —sólo `custodioUid` y `custodioCorreo` (pf-app-custodio
 * §5.1)—; el nombre vive en `usuarios/{uid}.nombre`. El analista tiene permiso de lectura
 * sobre `usuarios` por la rama `esAnalista()` de las reglas (pf-app-custodio/firebase/
 * firestore.rules).
 *
 * Este módulo es parte de la frontera `lib/datos/`: es de los pocos lugares del repo que
 * importan el SDK de Firebase (lo impone la regla de ESLint). Las pantallas no lo tocan
 * directo: reciben los viajes ya enriquecidos.
 */

import { doc, getDoc, type DocumentData } from 'firebase/firestore';

import { firestore } from '@/lib/firebase/cliente';

import type { Viaje, Medio } from './tipos';

/** Vista mínima de un custodio que el panel necesita del directorio `usuarios`. */
export interface Custodio {
  uid: string;
  /** Nombre visible; `undefined` si el documento no existe o no trae `nombre`. */
  nombre?: string;
  telefono?: string;
}

/** Traduce un documento de `usuarios/{uid}` a la vista del panel. */
function aCustodio(uid: string, d: DocumentData): Custodio {
  const nombre = typeof d.nombre === 'string' && d.nombre.length > 0 ? d.nombre : undefined;
  const telefono = typeof d.telefono === 'string' ? d.telefono : undefined;
  // `exactOptionalPropertyTypes` prohíbe asignar `undefined` a una propiedad opcional:
  // se OMITE la clave cuando no hay valor, en vez de ponerla en undefined.
  return {
    uid,
    ...(nombre !== undefined ? { nombre } : {}),
    ...(telefono !== undefined ? { telefono } : {}),
  };
}

/**
 * Resuelve un conjunto de custodios por `uid`.
 *
 * Firestore no tiene un `getAll` por id en el SDK web, así que se hace un `getDoc` por
 * uid ÚNICO (los uids se deduplican antes) y en paralelo. Para la pantalla de Viajes,
 * donde una página trae por máximo `pageSize` renglones y varios comparten custodio, esto
 * son unas pocas lecturas, no una por renglón.
 *
 * Un uid sin documento (o con documento sin `nombre`) simplemente no aparece en el mapa;
 * el caller cae al teléfono. Un `uid` vacío se ignora.
 */
export async function obtenerCustodios(uids: readonly string[]): Promise<Map<string, Custodio>> {
  const unicos = [...new Set(uids.filter((uid) => uid.length > 0))];
  const resultados = await Promise.all(
    unicos.map(async (uid) => {
      try {
        const documento = await getDoc(doc(firestore, 'usuarios', uid));
        return documento.exists() ? aCustodio(uid, documento.data()) : null;
      } catch {
        // Un fallo puntual de lectura de un custodio no debe tumbar la lista entera:
        // el renglón cae al teléfono. Se reporta como "sin nombre".
        return null;
      }
    }),
  );

  const mapa = new Map<string, Custodio>();
  for (const custodio of resultados) {
    if (custodio) mapa.set(custodio.uid, custodio);
  }
  return mapa;
}

/**
 * Enriquece una lista de viajes con el `custodioName` resuelto desde `usuarios`.
 *
 * No muta los viajes de entrada: devuelve copias con `custodioName` puesto cuando el
 * directorio lo conoce. Los viajes sin nombre conocido quedan sin `custodioName` y la UI
 * cae a `custodioCorreo`.
 */
export async function enriquecerConNombres<T extends Pick<Viaje, 'custodioUid'>>(
  viajes: readonly T[],
): Promise<T[]> {
  const custodios = await obtenerCustodios(viajes.map((viaje) => viaje.custodioUid));
  return viajes.map((viaje) => {
    const nombre = custodios.get(viaje.custodioUid)?.nombre;
    return nombre ? { ...viaje, custodioName: nombre } : { ...viaje };
  });
}

/**
 * Enriquece una lista de medios con el `custodioNombre` resuelto desde `usuarios`.
 * Similar a enriquecerConNombres pero para el tipo Medio.
 */
export async function enriquecerMediosConNombres(medios: readonly Medio[]): Promise<Medio[]> {
  const custodios = await obtenerCustodios(medios.map((medio) => medio.custodioUid));
  return medios.map((medio) => {
    const nombre = custodios.get(medio.custodioUid)?.nombre;
    return nombre ? { ...medio, custodioNombre: nombre } : { ...medio };
  });
}
