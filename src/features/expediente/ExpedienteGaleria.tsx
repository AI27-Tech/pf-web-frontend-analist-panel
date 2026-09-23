import {
  ImageCard,
  ImageCarousel,
  Visor,
  type BadgeConfig,
  type CarouselSection,
} from '@ai27-tech/ui';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { urlMiniatura, urlOriginal } from '@/lib/datos/medios';
import type { Medio } from '@/lib/datos/tipos';
import { formatearBytes, horaLocal } from '@/lib/formato/tamano';
import {
  esMuestra,
  estadoProvisional,
  idCortoDe,
  imagenProvisional,
  resolverImagenVisor,
} from '@/features/galeria/provisional';

/**
 * Agrupa los medios de un viaje por `etiqueta` y los presenta con el `ImageCarousel` de
 * la librería, una sección por grupo.
 *
 * Sólo se muestran datos reales: el mockup dibuja una ubicación y un conteo de alertas
 * por sección que no existen en `Medio`, así que el título del grupo lleva la etiqueta
 * y el conteo real de archivos, y nada más.
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
  cargando?: boolean;
}

interface GrupoEtiqueta {
  etiqueta: string;
  medios: Medio[];
}

function agruparPorEtiqueta(medios: Medio[]): GrupoEtiqueta[] {
  const orden: string[] = [];
  const porEtiqueta = new Map<string, Medio[]>();

  for (const medio of medios) {
    const clave = medio.etiqueta || 'Sin etiqueta';
    if (!porEtiqueta.has(clave)) {
      orden.push(clave);
      porEtiqueta.set(clave, []);
    }
    porEtiqueta.get(clave)!.push(medio);
  }

  return orden.map((etiqueta) => ({ etiqueta, medios: porEtiqueta.get(etiqueta)! }));
}

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

export function ExpedienteGaleria({ medios, cargando = false }: ExpedienteGaleriaProps) {
  // El visor recorre TODOS los medios del expediente en el orden en que se agrupan; sólo
  // se guarda el índice inicial. `null` = cerrado.
  const [indiceVisor, setIndiceVisor] = useState<number | null>(null);

  const grupos = useMemo(() => agruparPorEtiqueta(medios), [medios]);

  // Los medios aplanados en el orden de las secciones: es la lista que ve el visor y sobre
  // la que se calcula el índice inicial al abrir una tarjeta.
  const mediosVisor = useMemo(() => grupos.flatMap((g) => g.medios), [grupos]);

  const mediums: MedioVisor[] = useMemo(
    () =>
      mediosVisor.map((medio) => ({
        id: medio.id,
        type: tipoAMedium(medio.tipo),
        label: medio.etiqueta,
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

  // `resolveUrl` debe ser estable entre renders (lo pide la librería): depende sólo del
  // índice por id. Recupera el `Medio` y delega en `resolverImagenVisor`.
  const resolveUrl = useCallback(
    (medium: MedioVisor): Promise<string> | string => {
      const medio = porId.get(medium.id);
      if (!medio) return '';
      return resolverImagenVisor(medio, urlOriginal);
    },
    [porId],
  );

  const sections: CarouselSection<Medio>[] = useMemo(
    () =>
      grupos.map((grupo, indiceGrupo) => ({
        title: (
          <span className="font-mono text-xs font-semibold tracking-widest uppercase">
            [{String(indiceGrupo + 1).padStart(2, '0')}] {grupo.etiqueta}
          </span>
        ),
        badge: (
          <span className="text-text-muted text-xs">
            {grupo.medios.length} {grupo.medios.length === 1 ? 'evidencia' : 'evidencias'}
          </span>
        ),
        items: grupo.medios,
        visibleItems: 6,
      })),
    [grupos],
  );

  if (!cargando && medios.length === 0) {
    return (
      <div className="border-border rounded-md border border-dashed px-8 py-12 text-center">
        <p className="text-text-muted text-sm">Este viaje no tiene archivos registrados todavía.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ImageCarousel
        sections={sections}
        gap="0.75rem"
        renderItem={(medio: Medio) => (
          // Ancho fijo por tarjeta para que la tira muestre varias miniaturas por fila y
          // se desplace, en lugar de estirar una sola. `flex: none` impide que encojan.
          <div className="w-44 flex-none">
            <MedioCard medio={medio} onAbrir={() => setIndiceVisor(mediosVisor.indexOf(medio))} />
          </div>
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
  const esDeMuestra = esMuestra(medio);
  // Guarda el par {id, url} en vez de sólo la url: así, al cambiar de medio, la url
  // vieja no se muestra un instante de más mientras se resuelve la nueva.
  const [resuelto, setResuelto] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (esDeMuestra) return;
    let vivo = true;
    void urlMiniatura(medio).then((url) => {
      if (vivo) setResuelto({ id: medio.id, url });
    });
    return () => {
      vivo = false;
    };
  }, [medio, esDeMuestra]);

  const urlReal = resuelto && resuelto.id === medio.id ? resuelto.url : null;
  const src = esDeMuestra ? imagenProvisional(medio) : urlReal;
  const estado = estadoProvisional(medio);

  // Dos sellos sobre la miniatura.
  const badges: BadgeConfig[] = [
    { label: horaLocal(medio.capturadoEn), variant: 'neutral', position: 'left' },
    { label: estado.label, variant: estado.variant, position: 'right' },
  ];

  return (
    <ImageCard
      src={src ?? ''}
      alt={medio.comentario ?? medio.etiqueta}
      title={<span className="font-mono text-xs">{nombreArchivo(medio)}</span>}
      subtitle={
        <span className="cifras-tabulares flex items-center gap-2 font-mono">
          {formatearBytes(medio.bytes)}
          <span className="text-text-placeholder">{idCortoDe(medio)}</span>
        </span>
      }
      badges={badges}
      onClick={onAbrir}
    />
  );
}

/** Nombre de archivo: último segmento de la ruta del original, con respaldo a la
 *  etiqueta. Es lo que la maqueta muestra bajo cada miniatura. */
function nombreArchivo(medio: Medio): string {
  const segmento = medio.rutaOriginal.split('/').pop() ?? '';
  return segmento || medio.etiqueta || 'SIN_NOMBRE';
}
