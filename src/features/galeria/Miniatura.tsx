import { Headphones } from 'lucide-react';
import React from 'react';
import type { Medio } from '@/lib/datos/tipos';
import { formatearBytes, horaLocal } from '@/lib/formato/tamano';
import { urlMiniatura } from '@/lib/datos/medios';
/**
 * Una celda de la rejilla de la galería: la evidencia como tarjeta.
 *
 * Reproduce la maqueta forense: hora de captura arriba a la izquierda, sello de estado
 * arriba a la derecha, la imagen, y debajo el nombre del archivo con la unidad y el peso.
 *
 * Provisional: la imagen y el sello de estado salen de `provisional.ts` (ver ese
 * archivo). Todo lo demás —hora, nombre, unidad, peso— es dato real del `Medio`.
 *
 * Es un `<button>`: abrir el visor es la acción de la celda, así queda accesible por
 * teclado y con clic-derecho sin trucos.
 */
export interface MiniaturaProps {
  medio: Medio;
  onOpen: () => void;
}
/** Nombre de archivo a partir de la ruta del original: el último segmento de la ruta.
 *  Si la ruta viene vacía, se cae a la primera etiqueta para no mostrar un hueco. */
function fileName(medio: Medio): string {
  const segment = medio.rutaOriginal.split('/').pop() ?? '';
  return segment || (medio.etiquetas || [])[0] || 'SIN_NOMBRE';
}
export function Miniatura({ medio, onOpen }: MiniaturaProps) {
  const isAudio = medio.tipo === 'AUDIO';
  const [miniUrl, setMiniUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (isAudio) return;
    urlMiniatura(medio)
      .then(setMiniUrl)
      .catch((e) => {
        console.warn(`Error cargando miniatura de ${medio.id}:`, e);
      });
  }, [medio, isAudio]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir ${fileName(medio)}`}
      className="group border-border bg-surface hover:border-accent focus-visible:ring-accent flex flex-col overflow-hidden rounded-md border text-left transition-colors focus:outline-none focus-visible:ring-2"
    >
      {/* Lienzo cuadrado: imagen, con la hora superpuesta en la esquina superior izquierda. */}
      <div className="bg-canvas relative aspect-square overflow-hidden">
        {isAudio ? (
          <div className="text-text-muted flex h-full w-full items-center justify-center">
            <Headphones size={28} strokeWidth={1.5} aria-hidden="true" />
          </div>
        ) : (
          <img
            src={miniUrl}
            alt={medio.comentario ?? (medio.etiquetas || [])[0] ?? 'Evidencia'}
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        )}
        {/* Hora de captura, esquina superior izquierda. Cifras tabulares para que no
            bailen entre celdas. */}
        <span className="cifras-tabulares absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[11px] text-white">
          {horaLocal(medio.capturadoEn)}
        </span>
      </div>
      {/* Pie de la celda: nombre del archivo y, debajo, unidad y peso. */}
      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        <span className="text-text truncate font-mono text-xs" title={fileName(medio)}>
          {fileName(medio)}
        </span>
        <span className="text-text-muted cifras-tabulares truncate font-mono text-[11px]">
          {medio.placas || 'S/N.E.'} · {formatearBytes(medio.bytes)}
        </span>
      </div>
    </button>
  );
}
