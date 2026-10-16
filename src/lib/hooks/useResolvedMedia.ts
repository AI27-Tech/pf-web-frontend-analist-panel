import { useEffect, useState } from 'react';

import { urlMiniatura, urlOriginal } from '@/lib/datos/medios';
import type { Medio } from '@/lib/datos/tipos';

/**
 * Estado de una URL resuelta desde Storage.
 * Una URL permanece `null` mientras se carga; `string` cuando se resuelve exitosamente.
 */
export interface ResolvedMedia {
  id: string;
  miniatura: string | null;
  original: string | null;
}

/**
 * Hook que resuelve las URLs (miniatura y original) de un medio desde Firebase Storage.
 *
 * Encapsula toda la lógica asíncrona de carga de URLs y manejo de estado del ciclo de vida.
 * El componente que lo usa solo recibe URLs ya resueltas, sin depender directamente de Firebase.
 *
 * Ventajas:
 * - Desacopla el componente de Firebase Storage
 * - Facilita testing: mockeador el hook, no Firebase completo
 * - Reutilizable: cualquier componente que necesite URLs puede usarlo
 * - Cacheable: se puede agregar memoización futura
 *
 * @param medio - El medio (foto/audio) cuyas URLs se van a resolver
 * @returns Objeto con `id`, `miniatura` y `original` (null mientras se cargan)
 *
 * @example
 * ```typescript
 * function MedioCard({ medio }) {
 *   const { miniatura, original } = useResolvedMedia(medio);
 *   return <img src={miniatura ?? ''} />;
 * }
 * ```
 */
export function useResolvedMedia(medio: Medio): ResolvedMedia {
  const [resuelto, setResuelto] = useState<ResolvedMedia>({
    id: medio.id,
    miniatura: null,
    original: null,
  });

  useEffect(() => {
    let vivo = true;

    // Resolver ambas URLs en paralelo
    Promise.all([urlMiniatura(medio).catch(() => null), urlOriginal(medio).catch(() => null)]).then(
      ([miniatura, original]) => {
        if (vivo) {
          setResuelto({
            id: medio.id,
            miniatura,
            original,
          });
        }
      },
    );

    return () => {
      vivo = false;
    };
  }, [medio]);

  return resuelto;
}
