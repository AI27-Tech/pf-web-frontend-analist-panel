import { Badge } from '@ai27-tech/ui';
import { Headphones } from 'lucide-react';
import type { Medio } from '@/lib/datos/tipos';
import { formatearBytes, horaLocal } from '@/lib/formato/tamano';
import { estadoProvisional, imagenProvisional } from './provisional';
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
  const estado = estadoProvisional(medio);
  const isAudio = medio.tipo === 'AUDIO';
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir ${fileName(medio)}`}
      className="group border-border bg-surface hover:border-accent focus-visible:ring-accent flex flex-col overflow-hidden rounded-md border text-left transition-colors focus:outline-none focus-visible:ring-2"
    >
      {/* Lienzo cuadrado: imagen, con la hora y el estado superpuestos en las esquinas. */}
      <div className="bg-canvas relative aspect-square overflow-hidden">
        {isAudio ? (
          <div className="text-text-muted flex h-full w-full items-center justify-center">
            <Headphones size={28} strokeWidth={1.5} aria-hidden="true" />
          </div>
        ) : (
          <img
            src={imagenProvisional(medio)}
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
        {/* Sello de estado, esquina superior derecha. */}
        <span className="absolute top-1.5 right-1.5">
          <Badge variant={estado.variant}>{estado.label}</Badge>
        </span>
      </div>
      {/* Pie de la celda: nombre del archivo y, debajo, unidad y peso. */}
      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        <span className="text-text truncate font-mono text-xs" title={fileName(medio)}>
          {fileName(medio)}
        </span>
        <span className="text-text-muted cifras-tabulares truncate font-mono text-[11px]">
          {medio.placas || 'S/UNIDAD'} · {formatearBytes(medio.bytes)}
        </span>
      </div>
    </button>
  );
}
