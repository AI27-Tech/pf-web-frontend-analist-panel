/*
 * GaleriaSection. La `*Section` del dominio `galeria`.
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
import { useState } from 'react';
import { Headphones } from 'lucide-react';

import { useResolvedMedia } from '@/lib/hooks/useResolvedMedia';
import { urlOriginal } from '@/lib/datos/medios';
import { etiquetaVisible, type Medio } from '@/lib/datos/tipos';
import { rangoDeAtajo, type Atajo } from '@/lib/formato/fechas';
import { horaLocal } from '@/lib/formato/tamano';

export interface GaleriaSectionProps {
  readonly medios: readonly Medio[];
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const INITIAL_PAGE_SIZE = 25;

export function GaleriaSection({ medios }: GaleriaSectionProps) {
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
      options: [
        { label: 'Todas', value: 'TODO' },
        ...Array.from(new Set(medios.map((m) => m.placas).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, 'es'))
          .map((val) => ({ label: val, value: val })),
      ],
    },
    {
      key: 'custodio',
      label: 'Unidad',
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

  // Verifica si un medio cae dentro del rango `desde`/`hasta` (ambos `YYYY-MM-DD`).
  //
  // Se compara contra `medio.fechaLocal` —la fecha local de México que escribe el
  // productor— y NO contra `capturadoEn.toISOString()`. `toISOString()` da la fecha en
  // UTC: una foto tomada hoy por la tarde en México cae en el día UTC siguiente y una de
  // la madrugada en el anterior, que es exactamente por qué «Hoy» mostraba fotos del día
  // de ayer. `fechaLocal` es la misma cadena que usan la pantalla de Viajes y la consulta
  // del backend, así que las tres comparten el rango sin depender de la zona de quien
  // consulta (ver `lib/formato/fechas.ts` y `lib/datos/medios.ts`).
  const medioDentroDeRango = (medio: Medio, desde: string, hasta: string): boolean => {
    if (!desde || !hasta) return true; // Si no hay rango, pasar todo
    if (!medio.fechaLocal) return false;
    return medio.fechaLocal >= desde && medio.fechaLocal <= hasta;
  };

  // Determina si un medio cumple con los filtros y búsqueda
  const matchesFiltersAndSearch = (medio: Medio): boolean => {
    // Aplicar filtro de fecha
    const periodo = filterValues.periodo;
    if (periodo) {
      if (periodo === 'todos') {
        // Todos los medios
      } else if (periodo === 'rango') {
        // Rango personalizado
        if (rangoDesde && rangoHasta) {
          if (!medioDentroDeRango(medio, rangoDesde, rangoHasta)) {
            return false;
          }
        }
      } else {
        // Atajo (hoy, semana, mes)
        const { desde, hasta } = rangoDeAtajo(periodo as Atajo);
        if (!medioDentroDeRango(medio, desde, hasta)) {
          return false;
        }
      }
    }

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
    if (filterValues.placa && filterValues.placa !== 'TODO' && medio.placas !== filterValues.placa)
      return false;
    if (
      filterValues.custodio &&
      filterValues.custodio !== 'TODO' &&
      medio.custodioUid !== filterValues.custodio
    )
      return false;

    // Aplicar búsqueda (buscar en etiquetas, comentario, placas y custodio por
    // nombre o UID; el filtro de custodio muestra el nombre, así que la búsqueda
    // también debe encontrar por nombre y no solo por UID).
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
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

  // Calcular el índice inicial del Visor basado en el ID abierto
  const initialVisibleIndex = openMedioId ? medios.findIndex((m) => m.id === openMedioId) : -1;

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

      {/* Contenido: Galería */}
      {viewMode === 'grid' ? (
        <>
          {/* Grid de imágenes */}
          <ImageGrid
            items={mediosPaginados}
            renderItem={(medio) => (
              <MiniaturaTarjeta medio={medio} onAbrir={() => setOpenMedioId(medio.id)} />
            )}
            columns={6}
            gap="1rem"
            emptyMessage={
              mediosFiltrados.length === 0 ? 'No hay archivos para estos filtros.' : 'Cargando...'
            }
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
      {openMedioId !== null && initialVisibleIndex >= 0 && medios[initialVisibleIndex] && (
        <Visor
          mediums={medios.map((medio) => ({
            id: medio.id,
            type: medio.tipo === 'AUDIO' ? 'AUDIO' : 'IMAGE',
            label: (medio.etiquetas || []).join(', ') || 'Sin etiqueta',
            comment: medio.comentario ?? '',
          }))}
          initialIndex={initialVisibleIndex}
          onClose={() => setOpenMedioId(null)}
          resolveUrl={(medium) => {
            const medio = medios.find((m) => m.id === medium.id);
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
  const tamanoMB = (medio.bytes / (1024 * 1024)).toFixed(2);
  // Hora en zona de México (`horaLocal`), no la del navegador: así el sello coincide con
  // el día por el que se filtra (`fechaLocal`). Antes se calculaba con `getHours()`, que
  // usa la zona del navegador y podía caer en otro día.
  const hora = horaLocal(medio.capturadoEn);
  // Id corto del medio: el primer segmento del id real. Sustituye al `idCortoDe` que
  // vivía en `provisional.ts` (retirado en etapa 6), que era un hash sintético para datos
  // de muestra; con medios reales el prefijo del id es un identificador legible.
  const idCorto = medio.id.slice(0, 8);
  const etiquetaPrincipal = medio.etiquetas?.[0] || medio.tipo;

  return (
    <ImageCard
      src={isAudio ? '' : (miniatura ?? '')}
      alt={etiquetaPrincipal}
      title={medio.id}
      subtitle={`${tamanoMB} MB ${idCorto}`}
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
