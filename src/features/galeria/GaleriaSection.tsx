/*
 * GaleriaSection. La `*Section` del dominio `galeria`.
 *
 * Presentacional: recibe los medios ya resueltos por props y NO llama a la API. El
 * fetch lo hace el `loader` de la ruta, que es la frontera (misma regla que el resto
 * del panel). Aquí sólo hay filtrado en cliente, layout y la apertura del visor.
 *
 * La galería es la vista ENTRE viajes: responde «todas las fotos de tal etiqueta en tal
 * periodo». El periodo ya viene aplicado desde el loader; los refinos de placa, custodio,
 * tipo y etiqueta se hacen aquí sobre el conjunto ya traído, porque son baratos y dan
 * respuesta inmediata sin otra ida a la red.
 *
 * Convención de nombres (naming-conventions.md): los sustantivos de dominio —`medio`,
 * `etiqueta`, `placa`, `custodio`, `tipo`, `estado`— conservan su forma en español;
 * el estado de UI y los helpers técnicos van en inglés, igual que en `PanelSection`.
 *
 * Qué opera de verdad y qué no, para no confundir maqueta con función:
 *  - SÍ operan: los cuatro filtros, el orden, la vista rejilla/lista, los chips de
 *    filtros activos y «Restablecer filtros». Todo sobre el conjunto ya cargado.
 *  - NO operan aún (van deshabilitados con un motivo visible): los atajos de periodo,
 *    «+ Más filtros», «Descargar lote» y «Cargar más». Requieren reconsultar el backend,
 *    selección de elementos o descarga, que se conectan cuando la galería tenga su
 *    propio estado de búsqueda (search params validados) y el backend real.
 */

import { Badge, Button, Select } from '@ai27-tech/ui';
import { Download, Grid3x3, List, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { urlOriginal } from '@/lib/datos/medios';
import type { Medio, TipoMedio } from '@/lib/datos/tipos';
import { Visor } from '@/features/visor/Visor';
import { formatearBytes, horaLocal } from '@/lib/formato/tamano';

import { Miniatura } from './Miniatura';
import { estadoProvisional, resolverImagenVisor } from './provisional';

/**
 * Resuelve la URL del visor. Para un medio real usa `urlOriginal` (Storage); para uno de
 * muestra devuelve el SVG local, porque su original no existe en Storage y pedirlo dejaría
 * el visor cargando indefinidamente. Definida en módulo para ser estable entre renders,
 * así el efecto del visor no se reejecuta. Cuando la galería consuma sólo datos reales,
 * aquí queda `urlOriginal` a secas.
 */
const resolveOriginal = (medio: Medio): Promise<string> | string =>
  resolverImagenVisor(medio, urlOriginal);

/** `tipo` es dominio; el resto de la unión describe estado de UI, así que va en inglés. */
type TipoFilter = 'TODO' | TipoMedio;
type Period = 'hoy' | 'semana' | 'mes' | 'rango';
type SortOrder = 'reciente' | 'antiguo';
type ViewMode = 'rejilla' | 'lista';

const TYPE_OPTIONS = [
  { label: 'Todas las categorías', value: 'TODO' },
  { label: 'Fotos', value: 'FOTO' },
  { label: 'Audios', value: 'AUDIO' },
] as const;

const PERIODS: readonly { id: Period; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'rango', label: 'Rango' },
];

/** Motivo que se muestra al pasar el cursor sobre los controles aún sin conectar. */
const PENDING = 'Disponible cuando se conecte el backend real';

export interface GaleriaSectionProps {
  readonly medios: readonly Medio[];
}

/** Nombre de archivo: último segmento de la ruta del original. */
function fileName(medio: Medio): string {
  return medio.rutaOriginal.split('/').pop() || medio.etiqueta || 'SIN_NOMBRE';
}

export function GaleriaSection({ medios }: GaleriaSectionProps) {
  const [period, setPeriod] = useState<Period>('mes');
  const [tipo, setTipo] = useState<TipoFilter>('TODO');
  const [etiqueta, setEtiqueta] = useState<string>('TODO');
  const [placa, setPlaca] = useState<string>('TODO');
  const [custodio, setCustodio] = useState<string>('TODO');
  const [sortOrder, setSortOrder] = useState<SortOrder>('reciente');
  const [viewMode, setViewMode] = useState<ViewMode>('rejilla');
  // Índice dentro de la lista visible que está abierto en el visor, o null si cerrado.
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Valores presentes en el conjunto, para poblar los filtros sin catálogo aparte.
  const { etiquetas, placas, custodios } = useMemo(() => {
    const et = new Set<string>();
    const pl = new Set<string>();
    const cu = new Set<string>();
    for (const medio of medios) {
      if (medio.etiqueta) et.add(medio.etiqueta);
      if (medio.placas) pl.add(medio.placas);
      if (medio.custodioUid) cu.add(medio.custodioUid);
    }
    const sorted = (valores: Set<string>) => [...valores].sort((a, b) => a.localeCompare(b, 'es'));
    return { etiquetas: sorted(et), placas: sorted(pl), custodios: sorted(cu) };
  }, [medios]);

  // El conjunto visible: el traído por el loader, refinado por los filtros y ordenado.
  const visible = useMemo(() => {
    const filtered = medios.filter((medio) => {
      if (tipo !== 'TODO' && medio.tipo !== tipo) return false;
      if (etiqueta !== 'TODO' && medio.etiqueta !== etiqueta) return false;
      if (placa !== 'TODO' && medio.placas !== placa) return false;
      if (custodio !== 'TODO' && medio.custodioUid !== custodio) return false;
      return true;
    });
    // Copia antes de ordenar: no mutar el array de props. Reciente = captura descendente.
    return [...filtered].sort((a, b) => {
      const diff = a.capturadoEn.getTime() - b.capturadoEn.getTime();
      return sortOrder === 'reciente' ? -diff : diff;
    });
  }, [medios, tipo, etiqueta, placa, custodio, sortOrder]);

  const etiquetaOptions = useMemo(
    () => [
      { label: 'Todas las categorías', value: 'TODO' },
      ...etiquetas.map((valor) => ({ label: valor, value: valor })),
    ],
    [etiquetas],
  );
  const placaOptions = useMemo(
    () => [
      { label: 'Todas las unidades', value: 'TODO' },
      ...placas.map((valor) => ({ label: valor, value: valor })),
    ],
    [placas],
  );
  const custodioOptions = useMemo(
    () => [
      { label: 'Todos los custodios', value: 'TODO' },
      ...custodios.map((valor) => ({ label: valor, value: valor })),
    ],
    [custodios],
  );

  // Chips de los filtros REALMENTE activos, con su acción de quitar. Reflejan el estado
  // y se pueden retirar; no son decorativos.
  const chips = useMemo(() => {
    const active: { key: string; text: string; remove: () => void }[] = [];
    if (placa !== 'TODO') active.push({ key: 'placa', text: `Unidad: ${placa}`, remove: () => setPlaca('TODO') });
    if (custodio !== 'TODO') active.push({ key: 'custodio', text: `Custodio: ${custodio}`, remove: () => setCustodio('TODO') });
    if (tipo !== 'TODO') active.push({ key: 'tipo', text: `Tipo: ${tipo}`, remove: () => setTipo('TODO') });
    if (etiqueta !== 'TODO') active.push({ key: 'etiqueta', text: `Categoría: ${etiqueta}`, remove: () => setEtiqueta('TODO') });
    return active;
  }, [placa, custodio, tipo, etiqueta]);

  const hasFilters = chips.length > 0;

  // Los conteos SIEMPRE salen del conjunto cargado, nunca de un número fijo: `total` es
  // todo lo que trajo el loader y `visible.length` lo que queda tras los filtros. Así,
  // cuando el loader consuma datos reales, la pantalla muestra la cantidad real sin
  // tocar la UI. `total` diverge de `visible.length` sólo cuando hay filtros activos.
  const total = medios.length;

  function resetFilters(): void {
    setTipo('TODO');
    setEtiqueta('TODO');
    setPlaca('TODO');
    setCustodio('TODO');
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Encabezado: título con sello del archivo, conteo, y atajos de periodo. */}
      <header className="border-border flex flex-wrap items-start justify-between gap-4 border-b px-8 py-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-text text-2xl font-semibold tracking-tight">Galería</h1>
            <Badge variant="escort" pill>
              AI27 FORENSIC ARCHIVE
            </Badge>
          </div>
          <p className="text-text-muted mt-1.5 flex items-center gap-2 text-sm">
            <span className="bg-success inline-block size-2 rounded-full" aria-hidden="true" />
            <span className="cifras-tabulares">{total.toLocaleString('es-MX')}</span>
            {total === 1
              ? 'evidencia fotográfica registrada en ruta'
              : 'evidencias fotográficas registradas en ruta'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Atajos de periodo. Deshabilitados: reconsultar el backend por periodo aún
              no está conectado, así que se marcan como pendientes en vez de fingir. */}
          <div
            className="border-border flex items-center gap-0.5 rounded-md border p-0.5 opacity-60"
            title={PENDING}
          >
            {PERIODS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                disabled
                onClick={() => setPeriod(id)}
                aria-pressed={period === id}
                className={
                  period === id
                    ? 'bg-accent text-on-accent rounded px-3 py-1 text-sm font-medium'
                    : 'text-text-muted rounded px-3 py-1 text-sm'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Barra de filtros: cuatro selects con su etiqueta encima, y «+ Más filtros». */}
      <div className="border-border grid grid-cols-1 items-end gap-3 border-b px-8 py-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1">
          <span className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
            Placa [unidad]
          </span>
          <Select
            aria-label="Filtrar por placa"
            options={placaOptions}
            value={placa}
            onChange={(event) => setPlaca(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
            Custodio [agente]
          </span>
          <Select
            aria-label="Filtrar por custodio"
            options={custodioOptions}
            value={custodio}
            onChange={(event) => setCustodio(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
            Tipo [evidencia]
          </span>
          <Select
            aria-label="Filtrar por tipo"
            options={[...TYPE_OPTIONS]}
            value={tipo}
            onChange={(event) => setTipo(event.target.value as TipoFilter)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
            Novedad [status]
          </span>
          <Select
            aria-label="Filtrar por etiqueta"
            options={etiquetaOptions}
            value={etiqueta}
            onChange={(event) => setEtiqueta(event.target.value)}
          />
        </label>
        <Button
          variant="outline"
          disabled
          title={PENDING}
          startIcon={<SlidersHorizontal size={16} strokeWidth={1.75} />}
        >
          + Más filtros
        </Button>
      </div>

      {/* Chips de filtros activos + restablecer. Reflejan el estado real y se quitan. */}
      <div className="border-border flex flex-wrap items-center gap-2 border-b px-8 py-3">
        <span className="text-text-muted mr-1 text-xs font-semibold">Activos:</span>
        {hasFilters ? (
          chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.remove}
              className="border-border text-text-muted hover:border-accent hover:text-text inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors"
            >
              {chip.text}
              <X size={12} strokeWidth={2} aria-hidden="true" />
            </button>
          ))
        ) : (
          <span className="text-text-muted text-xs">Ninguno</span>
        )}
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasFilters}
          className="text-accent ml-auto text-xs enabled:hover:underline disabled:opacity-40"
        >
          ↺ Restablecer filtros
        </button>
      </div>

      {/* Barra de resultados: conteo, orden, vista y descarga de lote. */}
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-8 py-3">
        <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">
          Archivos de evidencia · mostrando{' '}
          <span className="text-text cifras-tabulares">{visible.length}</span> de{' '}
          <span className="cifras-tabulares">{total.toLocaleString('es-MX')}</span> fotografías
        </p>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Ordenar por"
            options={[
              { label: 'Más reciente (Timestamp)', value: 'reciente' },
              { label: 'Más antiguo', value: 'antiguo' },
            ]}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
          />
          <div className="border-border flex items-center gap-0.5 rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('rejilla')}
              aria-pressed={viewMode === 'rejilla'}
              aria-label="Vista de rejilla"
              className={
                viewMode === 'rejilla'
                  ? 'bg-accent text-on-accent rounded p-1.5'
                  : 'text-text-muted hover:text-text rounded p-1.5'
              }
            >
              <Grid3x3 size={16} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('lista')}
              aria-pressed={viewMode === 'lista'}
              aria-label="Vista de lista"
              className={
                viewMode === 'lista'
                  ? 'bg-accent text-on-accent rounded p-1.5'
                  : 'text-text-muted hover:text-text rounded p-1.5'
              }
            >
              <List size={16} strokeWidth={1.75} />
            </button>
          </div>
          <Button
            variant="primary"
            disabled
            title={PENDING}
            startIcon={<Download size={16} strokeWidth={1.75} />}
          >
            Descargar lote seleccionado
          </Button>
        </div>
      </div>

      {/* Contenido: estado vacío, rejilla o lista, según la vista elegida. */}
      {visible.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
          <p className="text-text-muted max-w-prose text-sm">
            No hay archivos para estos filtros. Ajusta el periodo o cambia la unidad, el
            custodio, el tipo y la etiqueta.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-8 py-6">
          {viewMode === 'rejilla' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {visible.map((medio, index) => (
                <Miniatura key={medio.id} medio={medio} onOpen={() => setOpenIndex(index)} />
              ))}
            </div>
          ) : (
            <MediaList medios={visible} onOpen={setOpenIndex} />
          )}

          {/* Pie: sólo el conteo real de lo cargado y «Cargar más». No hay paginación
              inventada: la galería trae un lote acotado por el loader, así que el pie
              dice cuántas evidencias hay de verdad. «Cargar más» —traer el siguiente
              lote— va deshabilitado hasta que la consulta paginada exista en el backend. */}
          <div className="border-border mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
            <p className="text-text-muted text-sm">
              Mostrando <span className="text-text cifras-tabulares">{visible.length}</span> de{' '}
              <span className="cifras-tabulares">{total.toLocaleString('es-MX')}</span>{' '}
              {total === 1 ? 'evidencia sincronizada' : 'evidencias sincronizadas'}
            </p>
            <Button variant="outline" disabled title={PENDING}>
              Cargar más evidencias
            </Button>
          </div>
        </div>
      )}

      {/* El visor se alimenta del conjunto visible, para que las flechas naveguen entre
          lo que el analista está viendo y no entre todo el corpus. */}
      {openIndex !== null && (
        <Visor
          medios={[...visible]}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          resolveUrl={resolveOriginal}
        />
      )}
    </div>
  );
}

/** Vista de lista: una fila por evidencia. Alterna con la rejilla desde la barra de
 *  resultados. Cada fila abre el visor, igual que una miniatura. */
function MediaList({
  medios,
  onOpen,
}: {
  readonly medios: readonly Medio[];
  readonly onOpen: (index: number) => void;
}) {
  return (
    <ul className="divide-border border-border divide-y rounded-md border">
      {medios.map((medio, index) => {
        const estado = estadoProvisional(medio);
        return (
          <li key={medio.id}>
            <button
              type="button"
              onClick={() => onOpen(index)}
              className="hover:bg-surface focus-visible:ring-accent flex w-full items-center gap-4 px-4 py-2.5 text-left focus:outline-none focus-visible:ring-2"
            >
              <span className="cifras-tabulares text-text-muted w-14 shrink-0 font-mono text-xs">
                {horaLocal(medio.capturadoEn)}
              </span>
              <span className="text-text min-w-0 flex-1 truncate font-mono text-sm">
                {fileName(medio)}
              </span>
              <span className="text-text-muted w-28 shrink-0 truncate font-mono text-xs">
                {medio.placas || 'S/UNIDAD'}
              </span>
              <span className="text-text-muted cifras-tabulares w-20 shrink-0 text-right font-mono text-xs">
                {formatearBytes(medio.bytes)}
              </span>
              <span className="w-24 shrink-0 text-right">
                <Badge variant={estado.variant}>{estado.label}</Badge>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
