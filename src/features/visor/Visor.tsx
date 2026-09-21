import { Button } from '@ai27-tech/ui';
import {
  ChevronLeft,
  ChevronRight,
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
 * El visor: superposición a pantalla completa para leer el contenido de una foto.
 * Es el corazón del panel (docs/PLAN.md §7).
 *
 * No importa `firebase/*`: recibe los medios ya resueltos y una función para obtener
 * la URL del original. En producción esa función es `urlOriginal` de
 * `lib/datos/medios.ts`; en desarrollo, una que devuelve `rutaOriginal` tal cual.
 *
 * Tema: el chrome que flota sobre la imagen (encabezado y flechas) se fuerza a oscuro
 * con `data-theme="dark"`, porque un visor de evidencia vive sobre fondo oscuro para
 * que la foto resalte. Al forzar el tema, los tokens `--ui-*` toman sus valores
 * oscuros y los componentes de la librería se ven correctos sin colores a mano. La
 * barra de controles de abajo, en cambio, respeta el tema de la app.
 *
 * Interacción:
 *  - Zoom con la rueda y con los botones de la barra.
 *  - Desplazamiento arrastrando cuando hay zoom.
 *  - Rotación de 90° en ambos sentidos.
 *  - Ajustar a pantalla (reinicia zoom, desplazamiento y rotación).
 *  - Teclado: ← → navegan, +/− hacen zoom, r rota, 0 reinicia, Esc cierra.
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

const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_STEP = 0.25;

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

/** Tema actual de la app, leído del <html>. Sirve para que la barra de controles lo
 *  respete aunque el resto del visor esté forzado a oscuro. */
function appTheme(): string {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') ?? 'dark';
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

export function Visor({
  medios,
  initialIndex,
  onClose,
  resolveUrl = resolveByRutaOriginal,
}: VisorProps) {
  const [index, setIndex] = useState(initialIndex);
  const [resolved, setResolved] = useState<{ id: string; url: string } | null>(null);
  const [transform, setTransform] = useState<Transform>(INITIAL_TRANSFORM);

  // Último punto del ratón, en un ref para no re-renderizar en cada movimiento.
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  // "Está arrastrando" sí es estado: se lee en el render (cursor, transición).
  const [dragging, setDragging] = useState(false);

  const medio = medios[index];
  const url = resolved && medio && resolved.id === medio.id ? resolved.url : null;

  const reset = useCallback(() => setTransform(INITIAL_TRANSFORM), []);

  const goTo = useCallback((move: (i: number, n: number) => number) => {
    // Al cambiar de medio se reinicia la transformación: el zoom de una foto no debe
    // heredarse a la siguiente.
    setTransform(INITIAL_TRANSFORM);
    setIndex((i) => move(i, medios.length));
  }, [medios.length]);

  const previous = useCallback(() => {
    goTo((i, n) => (i - 1 + n) % n);
  }, [goTo]);

  const next = useCallback(() => {
    goTo((i, n) => (i + 1) % n);
  }, [goTo]);

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

  // Teclado: navegación, zoom, rotación, reinicio y cierre.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          previous();
          break;
        case 'ArrowRight':
          next();
          break;
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
  }, [onClose, previous, next, changeZoom, rotate, reset]);

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
    setTransform((prev) => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
    }));
  }

  function endDrag() {
    lastPoint.current = null;
    setDragging(false);
  }

  if (!medio) return null;

  return (
    <div
      // `data-theme="dark"` fuerza los tokens oscuros en todo el chrome flotante, así
      // los componentes y colores de la librería se ven correctos sin hex a mano.
      data-theme="dark"
      className="bg-canvas/95 fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`Visor de evidencia: ${medio.etiqueta}`}
    >
      {/* Barra superior: etiqueta, posición y cerrar. Sobre el overlay oscuro. */}
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

      {/* Lienzo: imagen transformable, con las flechas de navegación a los lados. */}
      <div
        ref={canvasRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        style={{ cursor: transform.zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {medios.length > 1 && (
          <Button
            variant="ghost"
            onClick={previous}
            aria-label="Anterior"
            className="absolute left-4 z-10"
          >
            <ChevronLeft size={28} strokeWidth={1.5} />
          </Button>
        )}

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

        {medios.length > 1 && (
          <Button
            variant="ghost"
            onClick={next}
            aria-label="Siguiente"
            className="absolute right-4 z-10"
          >
            <ChevronRight size={28} strokeWidth={1.5} />
          </Button>
        )}
      </div>

      {/* Barra de controles flotante, centrada abajo. Respeta el tema de la app (no el
          oscuro forzado del chrome) volviendo a declarar `data-theme`. */}
      <div className="pointer-events-none flex justify-center pb-6">
        <div
          data-theme={appTheme()}
          className="bg-surface border-border pointer-events-auto flex items-center gap-1 rounded-lg border px-2 py-1.5 shadow-lg"
          role="toolbar"
          aria-label="Controles del visor"
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
    </div>
  );
}
