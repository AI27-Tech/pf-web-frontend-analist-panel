import { ImageCard, ImageGrid, Visor, type BadgeConfig } from '@ai27-tech/ui';
import { AlertTriangle, Headphones } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useCallback, useMemo, useState } from 'react';

import { useResolvedMedia } from '@/lib/hooks/useResolvedMedia';
import { urlOriginal } from '@/lib/datos/medios';
import { etiquetaVisible, type Medio } from '@/lib/datos/tipos';
import { formatearBytes, horaLocal } from '@/lib/formato/tamano';

/**
 * Presenta los medios de un viaje como una GRILLA (`ImageGrid` de la librería), no en
 * carrusel: todas las evidencias se ven de golpe en una rejilla paginable, que es como el
 * analista revisa un expediente. Es la misma `ImageGrid` de @ai27-tech/ui que usa la
 * galería, para que ambas vistas compartan la misma rejilla como fuente de verdad.
 *
 * Sólo se muestran datos reales: no hay sección por etiqueta (ver RETIRO DE ETIQUETADO),
 * así que la rejilla es plana sobre `medios`.
 *
 * Miniaturas: para un medio de muestra (`esMuestra`, ver `features/galeria/provisional`)
 * se usa el SVG local determinista, igual que en la galería; para uno real se resuelve
 * `urlMiniatura` contra Storage. El visor, en cambio, siempre pide el original en grande
 * vía `resolverImagenVisor`.
 *
 * Visor: se usa el `Visor` nativo de la librería en vez de uno propio.
 */
export interface ExpedienteGaleriaProps {
  medios: Medio[];
  mediosError?: string | null;
  cargando?: boolean;
}

// Forma de un grupo por etiqueta. Inerte junto con `agruparPorEtiqueta` (ver arriba).
// interface GrupoEtiqueta {
//   etiqueta: string;
//   medios: Medio[];
// }

// RETIRO DE ETIQUETADO (ver docs/PLAN_RETIRO_ETIQUETADO.md): la app custodio dejó de enviar
// `etiquetas` (llegan vacías), así que agrupar por etiqueta ya no tiene señal. El expediente
// pasa a una sola sección plana («Evidencias»). Se conserva comentado —no se borra— para
// reactivar la agrupación descomentando cuando la etiqueta vuelva.
// function agruparPorEtiqueta(medios: Medio[]): GrupoEtiqueta[] {
//   const orden: string[] = [];
//   const porEtiqueta = new Map<string, Medio[]>();
//
//   for (const medio of medios) {
//     // Un medio puede llevar varias etiquetas; el expediente lo agrupa por su etiqueta
//     // visible (la primera), que es el mismo criterio de una sola sección que ya usaba.
//     const clave = etiquetaVisible(medio);
//     if (!porEtiqueta.has(clave)) {
//       orden.push(clave);
//       porEtiqueta.set(clave, []);
//     }
//     porEtiqueta.get(clave)!.push(medio);
//   }
//
//   return orden.map((etiqueta) => ({ etiqueta, medios: porEtiqueta.get(etiqueta)! }));
// }

/**
 * Forma del medio que consume el `Visor` de la librería, derivada de sus propias props
 * en vez de nombrar el tipo exportado: así el componente sigue siendo la única fuente de
 * verdad del contrato y no se duplica su forma aquí.
 */
type MedioVisor = ComponentProps<typeof Visor>['mediums'][number];

/** Traduce el tipo de dominio al que espera el `Visor` de la librería. */
function tipoAMedium(tipo: Medio['tipo']): 'IMAGE' | 'AUDIO' {
  return tipo === 'AUDIO' ? 'AUDIO' : 'IMAGE';
}

export function ExpedienteGaleria({
  medios,
  mediosError = null,
  cargando = false,
}: ExpedienteGaleriaProps) {
  // El visor recorre TODOS los medios del expediente en el orden recibido; sólo se guarda
  // el índice inicial. `null` = cerrado.
  const [indiceVisor, setIndiceVisor] = useState<number | null>(null);

  // RETIRO DE ETIQUETADO: antes se agrupaban los medios por etiqueta y el visor recorría la
  // lista aplanada de grupos. Sin señal de etiqueta, el visor recorre `medios` directamente.
  const mediosVisor = medios;

  const mediums: MedioVisor[] = useMemo(
    () =>
      mediosVisor.map((medio) => ({
        id: medio.id,
        type: tipoAMedium(medio.tipo),
        label: etiquetaVisible(medio),
        ...(medio.comentario ? { comment: medio.comentario } : {}),
      })),
    [mediosVisor],
  );

  // Índice por id para recuperar el `Medio` de dominio dentro de `resolveUrl`, que la
  // librería llama con un `MedioVisor` recortado.
  const porId = useMemo(() => {
    const mapa = new Map<string, Medio>();
    for (const medio of mediosVisor) mapa.set(medio.id, medio);
    return mapa;
  }, [mediosVisor]);

  // `resolveUrl` debe ser estable entre renders (lo pide la librería): depende sólo de
  // la capacidad de resolver URLs. Recupera el `Medio` y usa `urlOriginal` directamente
  // (el hook `useResolvedMedia` se ejecuta en `MedioCard` cuando se renderiza; aquí
  // el visor solo necesita pedir la URL cuando el usuario abre la galería).
  const resolveUrl = useCallback(
    (medium: MedioVisor): Promise<string> | string => {
      const medio = porId.get(medium.id);
      if (!medio) return '';
      return urlOriginal(medio);
    },
    [porId],
  );

  // Si hay error, mostrar mensaje (después de los hooks)
  if (mediosError) {
    return (
      <div className="border-border rounded-md border border-dashed px-8 py-12 text-center">
        <AlertTriangle className="text-danger mx-auto mb-3 size-6" aria-hidden="true" />
        <p className="text-text-muted text-sm">{mediosError}</p>
      </div>
    );
  }

  if (!cargando && medios.length === 0) {
    return (
      <div className="border-border rounded-md border border-dashed px-8 py-12 text-center">
        <p className="text-text-muted text-sm">Este viaje no tiene archivos registrados todavía.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold tracking-widest uppercase">
          Evidencias
        </span>
        <span className="text-text-muted text-xs">
          {medios.length} {medios.length === 1 ? 'evidencia' : 'evidencias'}
        </span>
      </div>

      <ImageGrid
        items={medios}
        columns={6}
        gap="0.75rem"
        // Paginación de la propia `ImageGrid`: un expediente con muchas evidencias no se
        // dibuja en una rejilla interminable. 24 por página = 4 filas completas de 6
        // columnas. El `Visor` sigue recibiendo TODOS los medios del viaje (`mediums`) y
        // el índice se calcula contra la lista completa (`mediosVisor.indexOf`), así que
        // abrir una foto de cualquier página deja recorrer el viaje entero, no solo la
        // página visible.
        enablePagination
        itemsPerPage={24}
        // Sin `emptyMessage`: el caso «sin medios y sin cargar» ya lo cubre el bloque de
        // vacío de arriba (que no se muestra mientras `cargando`). Dárselo también a la
        // rejilla haría que apareciera el texto de vacío durante la carga.
        renderItem={(medio: Medio) => (
          <MedioCard
            key={medio.id}
            medio={medio}
            onAbrir={() => setIndiceVisor(mediosVisor.indexOf(medio))}
          />
        )}
      />

      {indiceVisor !== null && (
        <Visor
          mediums={mediums}
          initialIndex={indiceVisor}
          onClose={() => setIndiceVisor(null)}
          resolveUrl={resolveUrl}
        />
      )}
    </div>
  );
}

function MedioCard({ medio, onAbrir }: { medio: Medio; onAbrir: () => void }) {
  // Un audio no tiene miniatura: se muestra el ícono de audífonos, igual que en la
  // galería (`features/galeria`), en vez de una tarjeta con imagen vacía.
  const isAudio = medio.tipo === 'AUDIO';

  // Resolver URLs vía hook (desacoplado de Firebase Storage)
  const { miniatura } = useResolvedMedia(medio);

  const src = isAudio ? '' : (miniatura ?? '');

  // Dos sellos sobre la miniatura: la hora de captura (izquierda) y el tipo del medio
  // (derecha). RETIRO DE ETIQUETADO (ver docs/PLAN_RETIRO_ETIQUETADO.md): el sello derecho
  // usaba la etiqueta real (`etiquetaVisible`); sin señal de etiqueta cae al tipo (FOTO/AUDIO).
  const badges: BadgeConfig[] = [
    { label: horaLocal(medio.capturadoEn), variant: 'neutral', position: 'left' },
    {
      label: medio.tipo,
      variant: 'neutral',
      position: 'right',
    },
  ];

  return (
    <ImageCard
      src={src ?? ''}
      alt={medio.comentario ?? medio.tipo}
      title={<span className="font-mono text-xs">{nombreArchivo(medio)}</span>}
      subtitle={
        <span className="cifras-tabulares flex items-center gap-2 font-mono">
          {formatearBytes(medio.bytes)}
        </span>
      }
      badges={badges}
      onClick={onAbrir}
    >
      {isAudio && (
        <div className="flex h-full w-full items-center justify-center">
          <Headphones
            size={48}
            strokeWidth={1.5}
            color="rgba(255,255,255,0.7)"
            aria-hidden="true"
          />
        </div>
      )}
    </ImageCard>
  );
}

/** Nombre de archivo: último segmento de la ruta del original, con respaldo a la
 *  etiqueta. Es lo que la maqueta muestra bajo cada miniatura. */
function nombreArchivo(medio: Medio): string {
  const segmento = medio.rutaOriginal.split('/').pop() ?? '';
  return segmento || medio.etiquetas[0] || 'SIN_NOMBRE';
}
