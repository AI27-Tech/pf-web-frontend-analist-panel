import { Button } from '@ai27-tech/ui';
import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  Maximize,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Medio } from '@/lib/datos/tipos';

/**
 * El visor: superposición a pantalla completa para revisar una evidencia. Es el corazón
 * del panel (docs/PLAN.md §7).
 *
 * Maneja DOS tipos de medio con herramientas distintas, porque una foto y un audio no se
 * revisan igual:
 *  - FOTO → `VisorImagen`: zoom, desplazamiento y rotación.
 *  - AUDIO → `VisorAudio`: audífonos y un reproductor; nada de zoom ni rotación.
 *
 * El contenedor (`Visor`) es lo común a ambos: el overlay, el encabezado con la etiqueta
 * y la posición, las flechas de navegación, y el teclado común (← → navegan, Esc cierra).
 * Cada cuerpo aporta sus propios controles. Separarlos evita montar los listeners de
 * rueda/zoom cuando lo que suena es un audio.
 *
 * No importa `firebase/*`: recibe los medios ya resueltos y una función para obtener la
 * URL del original. En producción esa función es `urlOriginal` de `lib/datos/medios.ts`.
 *
 * Tema: el chrome que flota sobre el contenido se fuerza a oscuro con `data-theme="dark"`,
 * porque un visor de evidencia vive sobre fondo oscuro para que el contenido resalte. Al
 * forzar el tema, los tokens `--ui-*` toman sus valores oscuros y los componentes de la
 * librería se ven correctos sin colores a mano.
 */
export interface VisorProps {
  medios: Medio[];
  initialIndex: number;
  onClose: () => void;
  /**
   * Resuelve la URL del original de un medio. Por defecto usa `rutaOriginal`.
   * Si se pasa una función propia, DEBE ser estable entre renders (definida fuera del
   * componente o memoizada con `useCallback`); de lo contrario el efecto de carga se
   * reejecuta en cada render.
   */
  resolveUrl?: (medio: Medio) => Promise<string> | string;
}

const resolveByRutaOriginal = (medio: Medio): string => medio.rutaOriginal;

/** Tema actual de la app, leído del <html>. Sirve para que las barras de controles lo
 *  respeten aunque el resto del visor esté forzado a oscuro. */
function appTheme(): string {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') ?? 'dark';
}

export function Visor({
  medios,
  initialIndex,
  onClose,
  resolveUrl = resolveByRutaOriginal,
}: VisorProps) {
  const [index, setIndex] = useState(initialIndex);
  const [resolved, setResolved] = useState<{ id: string; url: string } | null>(null);

  const medio = medios[index];
  const url = resolved && medio && resolved.id === medio.id ? resolved.url : null;

  const previous = useCallback(() => {
    setIndex((i) => (i - 1 + medios.length) % medios.length);
  }, [medios.length]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % medios.length);
  }, [medios.length]);

  // Resuelve la URL del original al cambiar de medio. Depende del id (estable), no del
  // objeto medio, para que un array `medios` recreado en el padre no dispare recargas.
  const medioId = medio?.id;
  useEffect(() => {
    if (!medio) return;
    let alive = true;
    void Promise.resolve(resolveUrl(medio)).then((u) => {
      if (alive) setResolved({ id: medio.id, url: u });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medioId, resolveUrl]);

  // Teclado común a ambos cuerpos: navegación y cierre. El teclado propio de la imagen
  // (zoom, rotación) vive dentro de `VisorImagen`, que sólo se monta para fotos.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') previous();
      else if (event.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, previous, next]);

  if (!medio) return null;

  const esAudio = medio.tipo === 'AUDIO';

  return (
    <div
      // `data-theme="dark"` fuerza los tokens oscuros en todo el chrome flotante, así
      // los componentes y colores de la librería se ven correctos sin hex a mano.
      data-theme="dark"
      // El visor es un overlay de pantalla completa: tiene que ir por ENCIMA de la
      // Navbar `sticky` de la librería, que se apila en z-index 100. Usamos el mismo
      // nivel que sus modales (`--ui-z-modal`, 1000) para no quedar por debajo de la
      // barra superior y que ésta tape los controles del visor.
      className="bg-canvas/95 fixed inset-0 z-[1000] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`Visor de evidencia: ${medio.etiqueta}`}
    >
      {/* Barra superior: etiqueta, posición y cerrar. Común a foto y audio. */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-baseline gap-3">
          <span className="text-text text-sm font-semibold">{medio.etiqueta}</span>
          <span className="text-text-muted cifras-tabulares text-xs">
            {index + 1} / {medios.length}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar visor">
          <X size={20} strokeWidth={1.75} />
        </Button>
      </header>

      {/* Cuerpo según el tipo. La navegación (flechas) es común: se pinta aquí para que
          rodee a cualquiera de los dos cuerpos. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {medios.length > 1 && (
          <Button
            variant="ghost"
            onClick={previous}
            aria-label="Anterior"
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2"
          >
            <ChevronLeft size={28} strokeWidth={1.5} />
          </Button>
        )}

        {esAudio ? (
          <VisorAudio medio={medio} url={url} />
        ) : (
          <VisorImagen key={medio.id} medio={medio} url={url} />
        )}

        {medios.length > 1 && (
          <Button
            variant="ghost"
            onClick={next}
            aria-label="Siguiente"
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2"
          >
            <ChevronRight size={28} strokeWidth={1.5} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cuerpo de FOTO: zoom, desplazamiento y rotación.
// ---------------------------------------------------------------------------

const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_STEP = 0.25;

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

interface Transform {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

const INITIAL_TRANSFORM: Transform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

/**
 * Cuerpo del visor para una foto: lienzo transformable y su barra de controles.
 *
 * Se monta con `key={medio.id}` desde el contenedor, así que cada foto empieza con la
 * transformación en cero sin que haya que reiniciarla a mano al navegar.
 */
function VisorImagen({ medio, url }: { medio: Medio; url: string | null }) {
  const [transform, setTransform] = useState<Transform>(INITIAL_TRANSFORM);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const reset = useCallback(() => setTransform(INITIAL_TRANSFORM), []);

  const changeZoom = useCallback((delta: number) => {
    setTransform((prev) => {
      const zoom = clampZoom(prev.zoom + delta);
      // Si se vuelve a 1x, se recentra: un desplazamiento con zoom 1 no tiene sentido.
      if (zoom === 1) return { ...prev, zoom, offsetX: 0, offsetY: 0 };
      return { ...prev, zoom };
    });
  }, []);

  const rotate = useCallback((degrees: number) => {
    setTransform((prev) => ({ ...prev, rotation: (prev.rotation + degrees + 360) % 360 }));
  }, []);

  // Teclado propio de la imagen: zoom, rotación y reinicio. Sólo activo mientras hay una
  // foto en pantalla, porque este componente no se monta para audio.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case '+':
        case '=':
          changeZoom(ZOOM_STEP * 2);
          break;
        case '-':
          changeZoom(-ZOOM_STEP * 2);
          break;
        case 'r':
        case 'R':
          rotate(90);
          break;
        case '0':
          reset();
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changeZoom, rotate, reset]);

  // Zoom con la rueda. Prevendría el scroll de la página, así que se registra como no
  // pasivo directamente sobre el nodo del lienzo.
  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
    }
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [changeZoom]);

  function onMouseDown(event: React.MouseEvent) {
    if (transform.zoom <= 1) return;
    lastPoint.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  }

  function onMouseMove(event: React.MouseEvent) {
    const point = lastPoint.current;
    if (!point) return;
    const dx = event.clientX - point.x;
    const dy = event.clientY - point.y;
    lastPoint.current = { x: event.clientX, y: event.clientY };
    setTransform((prev) => ({ ...prev, offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }));
  }

  function endDrag() {
    lastPoint.current = null;
    setDragging(false);
  }

  return (
    <>
      <div
        ref={canvasRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        style={{ cursor: transform.zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {url ? (
          <img
            src={url}
            alt={medio.comentario ?? medio.etiqueta}
            draggable={false}
            className="max-h-full max-w-full object-contain select-none"
            style={{
              transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.zoom}) rotate(${transform.rotation}deg)`,
              transition: dragging ? 'none' : 'transform 120ms var(--ui-ease-standard, ease-out)',
            }}
          />
        ) : (
          <p className="text-text-muted text-sm">Cargando…</p>
        )}
      </div>

      {/* Barra de controles de imagen: zoom, rotación y ajustar a pantalla. */}
      <div className="pointer-events-none flex justify-center pb-6">
        <div
          data-theme={appTheme()}
          className="bg-surface border-border pointer-events-auto flex items-center gap-1 rounded-lg border px-2 py-1.5 shadow-lg"
          role="toolbar"
          aria-label="Controles de imagen"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => changeZoom(-ZOOM_STEP)}
            disabled={transform.zoom <= ZOOM_MIN}
            aria-label="Alejar"
            title="Alejar (−)"
          >
            <ZoomOut size={18} strokeWidth={1.75} />
          </Button>

          <span className="text-text-muted cifras-tabulares w-12 text-center text-xs">
            {Math.round(transform.zoom * 100)}%
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => changeZoom(ZOOM_STEP)}
            disabled={transform.zoom >= ZOOM_MAX}
            aria-label="Acercar"
            title="Acercar (+)"
          >
            <ZoomIn size={18} strokeWidth={1.75} />
          </Button>

          <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => rotate(-90)}
            aria-label="Rotar a la izquierda"
            title="Rotar a la izquierda"
          >
            <RotateCcw size={18} strokeWidth={1.75} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => rotate(90)}
            aria-label="Rotar a la derecha"
            title="Rotar a la derecha (r)"
          >
            <RotateCw size={18} strokeWidth={1.75} />
          </Button>

          <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />

          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            aria-label="Ajustar a pantalla"
            title="Ajustar a pantalla (0)"
          >
            <Maximize size={18} strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Cuerpo de AUDIO: audífonos y reproductor. Sin herramientas de imagen.
// ---------------------------------------------------------------------------

/**
 * Cuerpo del visor para un audio: el ícono de audífonos y un reproductor nativo.
 *
 * No hay zoom, rotación ni arrastre: un audio no se transforma, se escucha. El
 * reproductor nativo (`<audio controls>`) da play/pausa, línea de tiempo y volumen sin
 * reinventar nada, y respeta el tema de la app.
 */
function VisorAudio({ medio, url }: { medio: Medio; url: string | null }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6">
      <Headphones size={72} strokeWidth={1.25} className="text-text-muted" aria-hidden="true" />

      <div className="text-center">
        <p className="text-text text-sm font-semibold">{medio.etiqueta}</p>
        {medio.comentario && <p className="text-text-muted mt-1 max-w-prose text-xs">{medio.comentario}</p>}
      </div>

      {url === null ? (
        <p className="text-text-muted text-sm">Cargando…</p>
      ) : url === '' ? (
        // Muestra sin pista real: no hay archivo de audio en desarrollo. Se dice
        // explícito en vez de montar un reproductor que no suena.
        <p className="text-text-muted text-sm">Muestra sin audio disponible</p>
      ) : (
        // `key={url}` obliga a recrear el elemento al cambiar de audio, para que el
        // reproductor cargue el nuevo origen en lugar de seguir con el anterior.
        <audio key={url} src={url} controls autoPlay className="w-full max-w-md" />
      )}
    </div>
  );
}
