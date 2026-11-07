/*
 * GaleriaSection. La `*Section` del dominio `galeria`.
 *
 * - EN FIRESTORE: el período y el número económico (`listarMedios`). La galería no carga
 *   «todo» y filtra aquí; pide sólo lo que corresponde, así que el resultado no depende de
 *   cuántos archivos haya en total. El selector de números económicos sale de los viajes
 *   (`listarPlacas`), no de los medios cargados.
 * - EN EL CLIENTE: tipo, unidad (custodio) y búsqueda de texto, sobre lo ya cargado.
 *
 * Integración con librería @ai27-tech/ui:
 * - FilterBar: barra de filtros con selector de vista (grid/lista) y búsqueda
 * - ImageGrid: grilla de imágenes con renderItem personalizado
 * - Pagination: paginación de resultados
 * - ImageCard: renderiza cada item con su imagen y metadata
 * - Visor: abre fotos/audios con zoom, rotación y reproductor
 */

import { ImageGrid, ImageCard, Visor, Badge, FilterBar, Pagination, Table } from '@ai27-tech/ui';
import type { FilterDefinition, FilterValues } from '@ai27-tech/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertTriangle, Headphones } from 'lucide-react';

import { useResolvedMedia } from '@/lib/hooks/useResolvedMedia';
import { listarMedios, urlOriginal } from '@/lib/datos/medios';
import { etiquetaVisible, type Medio } from '@/lib/datos/tipos';
import { listarPlacas } from '@/lib/datos/viajes';
import { rangoDeAtajo, type Atajo, type RangoFechas } from '@/lib/formato/fechas';
import { formatearBytes, horaLocal, horaLocalConSegundos } from '@/lib/formato/tamano';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const INITIAL_PAGE_SIZE = 25;

/** Sin medios: referencia estable para no re-renderizar mientras llega la primera carga. */
const SIN_MEDIOS: readonly Medio[] = [];

/** Rango abierto: «Todos» los períodos. `listarMedios` ignora los extremos vacíos. */
const RANGO_ABIERTO: RangoFechas = { desde: '', hasta: '' };

/**
 * Forma del número económico tal como lo guarda la app custodio en `placas`: mayúsculas,
 * sin espacios ni guiones (pf-app-custodio §5.1). Permite comparar lo que teclea el
 * analista con el valor guardado.
 */
function normalizarPlaca(texto: string): string {
  return texto.toUpperCase().replace(/[\s-]/g, '');
}

export function GaleriaSection() {
  const [openMedioId, setOpenMedioId] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);
  const [searchValue, setSearchValue] = useState('');
  // Estados para filtros de fecha
  const [rangoDesde, setRangoDesde] = useState<string>('');
  const [rangoHasta, setRangoHasta] = useState<string>('');

  // Cargar URLs de miniaturas reales en paralelo (solo para FOTOs)
  // REFACTOR: Ya no es necesario este useEffect global. Cada Miniatura que se renderiza
  // usa el hook useResolvedMedia para cargar su propia URL bajo demanda.

  // --- Consulta a Firestore: período + número económico ---------------------------------

  // Período → rango de `fechaLocal`. «Todos» (o un rango personalizado incompleto) deja el
  // rango abierto.
  const periodoElegido = filterValues.periodo;
  const rango: RangoFechas =
    periodoElegido === 'hoy' || periodoElegido === 'semana' || periodoElegido === 'mes'
      ? rangoDeAtajo(periodoElegido as Atajo)
      : periodoElegido === 'rango' && rangoDesde && rangoHasta
        ? { desde: rangoDesde, hasta: rangoHasta }
        : RANGO_ABIERTO;

  // Números económicos de los viajes del período: alimentan el selector y permiten
  // reconocer cuando lo tecleado en la búsqueda es un número económico completo.
  const consultaPlacas = useQuery({
    queryKey: ['galeria-placas', rango.desde, rango.hasta],
    queryFn: () => listarPlacas(rango),
    placeholderData: keepPreviousData,
  });
  const placasDeViajes = consultaPlacas.data ?? [];

  // Número económico que se consulta en Firestore: el elegido en el selector o, si no hay
  // uno, el que se teclea en la búsqueda cuando coincide EXACTAMENTE con uno de los viajes
  // (sin importar mayúsculas, espacios ni guiones). Una búsqueda parcial («807Y») no puede
  // resolverse en el servidor, que sólo compara por igualdad: sigue buscando sobre lo ya
  // cargado, como el resto del texto (comentario, unidad).
  const placaDelSelector =
    filterValues.placa && filterValues.placa !== 'TODO' ? filterValues.placa : null;
  const placaDeLaBusqueda = placasDeViajes.includes(normalizarPlaca(searchValue))
    ? normalizarPlaca(searchValue)
    : null;
  const placaServidor = placaDelSelector ?? placaDeLaBusqueda;
  // Si la búsqueda ya se convirtió en filtro de número económico, no se vuelve a aplicar
  // como texto: «807-y453 real» no está literalmente en `placas` y vaciaría el resultado.
  const busquedaEnCliente =
    placaDelSelector === null && placaDeLaBusqueda !== null ? '' : searchValue;

  const consultaMedios = useQuery({
    queryKey: ['galeria-medios', rango.desde, rango.hasta, placaServidor],
    queryFn: () =>
      listarMedios({
        ...rango,
        ...(placaServidor !== null ? { placas: placaServidor } : {}),
      }).catch((error: unknown) => {
        // La pantalla sólo dice «no se pudo cargar»; el motivo (p. ej. un índice faltante
        // de Firestore, con su enlace de creación) queda en la consola.
        console.error('[Galería] Error al listar medios:', error);
        throw error;
      }),
    placeholderData: keepPreviousData,
  });
  const medios = consultaMedios.data?.medios ?? SIN_MEDIOS;

  // Definir los filtros
  const filters: FilterDefinition[] = [
    {
      key: 'periodo',
      label: 'Período',
      options: [
        { label: 'Todos', value: 'todos' },
        { label: 'Hoy', value: 'hoy' },
        { label: 'Esta semana', value: 'semana' },
        { label: 'Este mes', value: 'mes' },
        { label: 'Rango personalizado', value: 'rango' },
      ],
    },
    {
      key: 'tipo',
      label: 'Tipo de evidencia',
      options: [
        { label: 'Todas', value: 'TODO' },
        { label: 'Fotos', value: 'FOTO' },
        { label: 'Audios', value: 'AUDIO' },
      ],
    },
    // RETIRO DE ETIQUETADO (ver docs/PLAN_RETIRO_ETIQUETADO.md): la app custodio dejó de
    // enviar `etiquetas` (llegan vacías), así que el filtro de categoría se queda sin señal.
    // Se comenta —no se borra— para reactivarlo descomentando cuando la etiqueta vuelva.
    // {
    //   key: 'etiqueta',
    //   label: 'Categoría',
    //   options: [
    //     { label: 'Todas', value: 'TODO' },
    //     ...Array.from(new Set(medios.flatMap((m) => m.etiquetas || []).filter(Boolean)))
    //       .sort((a, b) => a.localeCompare(b, 'es'))
    //       .map((val) => ({ label: val, value: val })),
    //   ],
    // },
    {
      key: 'placa',
      label: 'Número económico',
      variant: 'searchable',
      options: [
        { label: 'Todas', value: 'TODO' },
        // Viajes del período + los medios cargados (por si un archivo trae un número
        // económico sin viaje) + el elegido, para que el selector nunca pierda su valor.
        ...Array.from(
          new Set(
            [...placasDeViajes, ...medios.map((m) => m.placas), placaDelSelector ?? ''].filter(
              Boolean,
            ),
          ),
        )
          .sort((a, b) => a.localeCompare(b, 'es'))
          .map((val) => ({ label: val, value: val })),
      ],
    },
    {
      key: 'custodio',
      label: 'Unidad',
      variant: 'searchable',
      options: [
        { label: 'Todos', value: 'TODO' },
        ...Array.from(new Set(medios.map((m) => m.custodioUid).filter(Boolean)))
          .map((uid) => {
            const medio = medios.find((m) => m.custodioUid === uid);
            return {
              label: medio?.custodioNombre || uid,
              value: uid,
            };
          })
          .sort((a, b) => a.label.localeCompare(b.label, 'es')),
      ],
    },
  ];

  // Determina si un medio cumple con los filtros y búsqueda que se aplican en el cliente.
  //
  // El período y el número económico NO se revisan aquí: ya los resolvió Firestore en
  // `listarMedios` (por `fechaLocal`, la fecha local de México que escribe el productor, no
  // por `capturadoEn.toISOString()`, que da el día en UTC; ver `lib/formato/fechas.ts`).
  const matchesFiltersAndSearch = (medio: Medio): boolean => {
    // Aplicar filtros
    if (filterValues.tipo && filterValues.tipo !== 'TODO' && medio.tipo !== filterValues.tipo)
      return false;
    // RETIRO DE ETIQUETADO (ver docs/PLAN_RETIRO_ETIQUETADO.md): sin señal de etiqueta no se
    // filtra por categoría. Se comenta —no se borra— junto con la definición del filtro.
    // if (
    //   filterValues.etiqueta &&
    //   filterValues.etiqueta !== 'TODO' &&
    //   !(medio.etiquetas || []).includes(filterValues.etiqueta)
    // )
    //   return false;
    if (
      filterValues.custodio &&
      filterValues.custodio !== 'TODO' &&
      medio.custodioUid !== filterValues.custodio
    )
      return false;

    // Aplicar búsqueda (buscar en etiquetas, comentario, placas y custodio por
    // nombre o UID; el filtro de custodio muestra el nombre, así que la búsqueda
    // también debe encontrar por nombre y no solo por UID).
    if (busquedaEnCliente) {
      const searchLower = busquedaEnCliente.toLowerCase();
      const etiquetasJoined = (medio.etiquetas || []).join(', ').toLowerCase();
      const hayCoincidencia =
        etiquetasJoined.includes(searchLower) ||
        (medio.comentario?.toLowerCase().includes(searchLower) ?? false) ||
        (medio.placas?.toLowerCase().includes(searchLower) ?? false) ||
        (medio.custodioNombre?.toLowerCase().includes(searchLower) ?? false) ||
        (medio.custodioUid?.toLowerCase().includes(searchLower) ?? false);
      if (!hayCoincidencia) return false;
    }

    return true;
  };

  // Filtrar medios
  const mediosFiltrados = medios.filter(matchesFiltersAndSearch);

  // Calcular paginación para grid
  const inicioGrid = (page - 1) * pageSize;
  const mediosPaginados = mediosFiltrados.slice(inicioGrid, inicioGrid + pageSize);

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'periodo') {
      // Si cambia de rango a otro, limpiar los valores de rango
      if (filterValues.periodo === 'rango' && value !== 'rango') {
        setRangoDesde('');
        setRangoHasta('');
      }
    }
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reiniciar a página 1
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setSearchValue('');
    setRangoDesde('');
    setRangoHasta('');
    setPage(1);
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    setPage(1);
  };
  const initialVisibleIndex = openMedioId
    ? mediosFiltrados.findIndex((m) => m.id === openMedioId)
    : -1;

  const muestraRangoPersonalizado = filterValues.periodo === 'rango';

  return (
    <div>
      {/* Barra de filtros */}
      <div style={{ marginBottom: '1rem' }}>
        <FilterBar
          filters={filters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          onClear={handleClearFilters}
          showClear={Object.keys(filterValues).length > 0 || searchValue.length > 0}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Buscar en etiqueta, comentario, número económico o unidad..."
          showFilterCount={true}
          showActiveFilterChips={true}
          enableViewToggle={true}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        {/* Controles de rango personalizado (solo cuando se selecciona "rango") */}
        {muestraRangoPersonalizado && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                Desde
              </label>
              <input
                type="date"
                value={rangoDesde}
                onChange={(e) => {
                  setRangoDesde(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                Hasta
              </label>
              <input
                type="date"
                value={rangoHasta}
                onChange={(e) => {
                  setRangoHasta(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              />
            </div>
            {rangoDesde && rangoHasta && (
              <div style={{ color: '#666', fontSize: '0.875rem' }}>
                Mostrando: {rangoDesde} a {rangoHasta}
              </div>
            )}
          </div>
        )}
      </div>

      {consultaMedios.data?.recortado && (
        <p className="text-text-muted mb-4 text-sm" role="status">
          Se muestran los archivos más recientes. Utiliza el filtrado para visualizar archivos
          específicos.
        </p>
      )}

      {/* Contenido: Galería */}
      {consultaMedios.isError && !consultaMedios.data ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <AlertTriangle className="text-danger size-8" aria-hidden="true" />
          <p className="text-text-muted text-sm">No se pudo cargar la galería en este momento.</p>
          <button
            type="button"
            onClick={() => void consultaMedios.refetch()}
            className="text-accent text-xs font-semibold hover:underline"
          >
            Reintentar
          </button>
        </div>
      ) : consultaMedios.isPending ? (
        <p className="text-text-muted py-12 text-center text-sm" role="status">
          Cargando galería…
        </p>
      ) : viewMode === 'grid' ? (
        <>
          {/* Grid de imágenes */}
          <ImageGrid
            items={mediosPaginados}
            renderItem={(medio) => (
              <MiniaturaTarjeta medio={medio} onAbrir={() => setOpenMedioId(medio.id)} />
            )}
            columns={6}
            gap="1rem"
            emptyMessage="No hay archivos para estos filtros."
          />
        </>
      ) : (
        <>
          {/* Vista de lista - usando Table de la librería */}
          <Table
            data={mediosPaginados}
            columns={[
              {
                key: 'thumbnail',
                header: '',
                align: 'center',
                width: '48px',
                cell: (medio: Medio) => <MiniaturaTablaSql medio={medio} />,
              },
              {
                key: 'capturadoEn',
                header: 'Fecha/Hora',
                // Fecha local de México (`fechaLocal`, la misma por la que se filtra) + hora
                // en zona de México (`horaLocal`). Antes mostraba sólo la hora del navegador,
                // que podía caer en otro día que el del filtro.
                cell: (medio: Medio) => (
                  <span className="cifras-tabulares">
                    {medio.fechaLocal} {horaLocal(medio.capturadoEn)}
                  </span>
                ),
              },
              {
                key: 'bytes',
                header: 'Tamaño',
                cell: (medio: Medio) => <span>{(medio.bytes / (1024 * 1024)).toFixed(1)} MB</span>,
              },
              {
                key: 'etiqueta',
                header: 'Etiqueta',
                cell: (medio: Medio) => {
                  // La etiqueta REAL del medio (`medio.etiquetas`), no el tipo. Antes esta
                  // columna se llamaba "Estado" y repetía el tipo, que ya se muestra en la
                  // columna "Tipo".
                  return <Badge variant="neutral">{etiquetaVisible(medio)}</Badge>;
                },
              },
              {
                key: 'tipo',
                header: 'Tipo',
                cell: (medio: Medio) => (
                  <Badge variant={medio.tipo === 'AUDIO' ? 'warning' : 'neutral'}>
                    {medio.tipo}
                  </Badge>
                ),
              },
              {
                key: 'placas',
                header: 'Número económico',
                cell: (medio: Medio) => <span>{medio.placas || 'S/N.E.'}</span>,
              },
            ]}
            density="compact"
            onRowClick={(row) => {
              setOpenMedioId((row as Medio).id);
            }}
          />
        </>
      )}

      {/* Paginación */}
      {mediosFiltrados.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={mediosFiltrados.length}
            onPageChange={setPage}
            onPageSizeChange={(newPageSize) => {
              setPageSize(newPageSize);
              setPage(1);
            }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            showInfo={true}
            siblingCount={1}
          />
        </div>
      )}

      {/* Visor: abre cuando se hace click en un item */}
      {openMedioId !== null && initialVisibleIndex >= 0 && mediosFiltrados[initialVisibleIndex] && (
        <Visor
          mediums={mediosFiltrados.map((medio) => ({
            id: medio.id,
            type: medio.tipo === 'AUDIO' ? 'AUDIO' : 'IMAGE',
            label: (medio.etiquetas || []).join(', ') || 'Sin etiqueta',
            comment: medio.comentario ?? '',
          }))}
          initialIndex={initialVisibleIndex}
          onClose={() => setOpenMedioId(null)}
          resolveUrl={(medium) => {
            const medio = mediosFiltrados.find((m) => m.id === medium.id);
            return medio ? urlOriginal(medio) : '';
          }}
        />
      )}
    </div>
  );
}

/**
 * Componente para renderizar una miniatura de un medio en la galería.
 * Usa useResolvedMedia para cargar la URL de forma desacoplada de Firebase.
 */
function MiniaturaTarjeta({ medio, onAbrir }: { medio: Medio; onAbrir: () => void }) {
  const isAudio = medio.tipo === 'AUDIO';
  const { miniatura } = useResolvedMedia(medio);
  // Hora en zona de México con segundos (`horaLocalConSegundos`).
  const hora = horaLocalConSegundos(medio.capturadoEn);
  const etiquetaPrincipal = medio.etiquetas?.[0] || medio.tipo;

  return (
    <ImageCard
      src={isAudio ? '' : (miniatura ?? '')}
      alt={etiquetaPrincipal}
      title=""
      className="[&_h3:empty]:hidden"
      aria-label={`Abrir ${isAudio ? 'audio' : 'foto'} capturada a las ${hora}`}
      subtitle={<span className="cifras-tabulares font-mono">{formatearBytes(medio.bytes)}</span>}
      onClick={onAbrir}
      badges={[
        { label: hora, variant: 'neutral', position: 'left' },
        {
          label: etiquetaPrincipal,
          variant: isAudio ? 'warning' : 'neutral',
          position: 'right',
          truncate: true,
          tooltip: 'custom',
        },
      ]}
    >
      {isAudio && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <Headphones size={48} strokeWidth={1.5} color="rgba(255,255,255,0.7)" />
        </div>
      )}
    </ImageCard>
  );
}

/**
 * Componente para renderizar una miniatura en la vista de tabla (lista).
 * Necesario porque los callbacks de celda de Table no pueden ser hooks.
 */
function MiniaturaTablaSql({ medio }: { medio: Medio }) {
  const isAudio = medio.tipo === 'AUDIO';
  const { miniatura } = useResolvedMedia(medio);

  if (isAudio) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
        }}
      >
        <Headphones size={20} strokeWidth={1.5} color="currentColor" />
      </div>
    );
  }

  return (
    <img
      src={miniatura ?? ''}
      alt={(medio.etiquetas || [])[0] || 'Evidencia'}
      style={{
        width: '40px',
        height: '40px',
        objectFit: 'cover',
        borderRadius: '3px',
      }}
    />
  );
}
