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
import { useEffect, useState } from 'react';
import { Headphones } from 'lucide-react';
 
import { urlOriginal, urlMiniatura } from '@/lib/datos/medios';
import type { Medio } from '@/lib/datos/tipos';
import { resolverImagenVisor, imagenProvisional, estadoProvisional, esMuestra, idCortoDe } from './provisional';
 
export interface GaleriaSectionProps {
  readonly medios: readonly Medio[];
}
 
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const INITIAL_PAGE_SIZE = 25;
 
export function GaleriaSection({ medios }: GaleriaSectionProps) {
  const [openMedioId, setOpenMedioId] = useState<string | null>(null);
  const [urlsMiniatura, setUrlsMiniatura] = useState<Map<string, string>>(new Map());
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);
  const [searchValue, setSearchValue] = useState('');
 
  // Cargar URLs de miniaturas reales en paralelo (solo para FOTOs)
  useEffect(() => {
    const cargarMiniaturasReales = async () => {
      const urls = new Map<string, string>();
      await Promise.all(
        medios.map(async (medio) => {
          // Para audios, no cargar URL: mostrar ícono
          if (medio.tipo === 'AUDIO') {
            urls.set(medio.id, ''); // Vacío indica "mostrar ícono"
            return;
          }
 
          try {
            // Para medios de muestra, usar imagen provisional
            if (esMuestra(medio)) {
              urls.set(medio.id, imagenProvisional(medio));
            } else {
              // Para fotos reales, obtener URL de Storage
              const url = await urlMiniatura(medio);
              urls.set(medio.id, url);
            }
          } catch (error) {
            console.warn(`[Galería] Error cargando miniatura de ${medio.id}:`, error);
            // Fallback a provisional en caso de error
            urls.set(medio.id, imagenProvisional(medio));
          }
        }),
      );
      setUrlsMiniatura(urls);
    };
 
    cargarMiniaturasReales();
  }, [medios]);
 
  // Definir los filtros
  const filters: FilterDefinition[] = [
    {
      key: 'tipo',
      label: 'Tipo de evidencia',
      options: [
        { label: 'Todas', value: 'TODO' },
        { label: 'Fotos', value: 'FOTO' },
        { label: 'Audios', value: 'AUDIO' },
      ],
    },
    {
      key: 'etiqueta',
      label: 'Categoría',
      options: [
        { label: 'Todas', value: 'TODO' },
        ...Array.from(new Set(medios.flatMap((m) => m.etiquetas || []).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, 'es'))
          .map((val) => ({ label: val, value: val })),
      ],
    },
    {
      key: 'placa',
      label: 'Unidad',
      options: [
        { label: 'Todas', value: 'TODO' },
        ...Array.from(new Set(medios.map((m) => m.placas).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, 'es'))
          .map((val) => ({ label: val, value: val })),
      ],
    },
    {
      key: 'custodio',
      label: 'Custodio',
      options: [
        { label: 'Todos', value: 'TODO' },
        ...Array.from(new Set(medios.map((m) => m.custodioUid).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, 'es'))
          .map((val) => ({ label: val, value: val })),
      ],
    },
  ];
 
  // Determina si un medio cumple con los filtros y búsqueda
  const matchesFiltersAndSearch = (medio: Medio): boolean => {
    // Aplicar filtros
    if (filterValues.tipo && filterValues.tipo !== 'TODO' && medio.tipo !== filterValues.tipo) return false;
    if (filterValues.etiqueta && filterValues.etiqueta !== 'TODO' && !(medio.etiquetas || []).includes(filterValues.etiqueta)) return false;
    if (filterValues.placa && filterValues.placa !== 'TODO' && medio.placas !== filterValues.placa) return false;
    if (filterValues.custodio && filterValues.custodio !== 'TODO' && medio.custodioUid !== filterValues.custodio) return false;
 
    // Aplicar búsqueda (buscar en etiquetas, comentario, placas y custodio)
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      const etiquetasJoined = (medio.etiquetas || []).join(', ').toLowerCase();
      const hayCoincidencia =
        etiquetasJoined.includes(searchLower) ||
        (medio.comentario?.toLowerCase().includes(searchLower) ?? false) ||
        (medio.placas?.toLowerCase().includes(searchLower) ?? false) ||
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
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reiniciar a página 1
  };
 
  const handleClearFilters = () => {
    setFilterValues({});
    setSearchValue('');
    setPage(1);
  };
 
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    setPage(1);
  };
 
  // Calcular el índice inicial del Visor basado en el ID abierto
  const initialVisibleIndex = openMedioId ? medios.findIndex((m) => m.id === openMedioId) : -1;
 
  return (
    <div style={{ padding: '2rem' }}>
      {/* Cabezal */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, margin: 0 }}>Galería</h1>
          <Badge variant="escort" pill>
            AI27 FORENSIC ARCHIVE
          </Badge>
        </div>
        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--ui-text-muted, #999)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-block', width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--ui-success, #10b981)' }} />
          {mediosFiltrados.length.toLocaleString('es-MX')} {mediosFiltrados.length === 1 ? 'evidencia' : 'evidencias'} {mediosFiltrados.length === medios.length ? 'registradas' : 'que coinciden con los filtros'}
        </p>
      </div>
 
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
          searchPlaceholder="Buscar en etiqueta, comentario, unidad o custodio..."
          showFilterCount={true}
          showActiveFilterChips={true}
          enableViewToggle={true}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      </div>
 
      {/* Contenido: Galería */}
      {viewMode === 'grid' ? (
        <>
          {/* Grid de imágenes */}
          <ImageGrid
            items={mediosPaginados}
            renderItem={(medio) => {
              const isAudio = medio.tipo === 'AUDIO';
              const urlMini = urlsMiniatura.get(medio.id);
              const estado = estadoProvisional(medio);
              const idCorto = idCortoDe(medio);
              const tamanoMB = (medio.bytes / (1024 * 1024)).toFixed(2);
              const hora = `${medio.capturadoEn.getHours().toString().padStart(2, '0')}:${medio.capturadoEn.getMinutes().toString().padStart(2, '0')}`;
 
              return (
                <ImageCard
                  key={medio.id}
                  src={isAudio ? '' : urlMini || imagenProvisional(medio, 640)}
                  alt={(medio.etiquetas || [])[0] || 'Evidencia'}
                  title={medio.id}
                  subtitle={`${tamanoMB} MB ${idCorto}`}
                  onClick={() => {
                    setOpenMedioId(medio.id);
                  }}
                  badges={[
                    { label: hora, variant: 'neutral', position: 'left' },
                    { label: estado.label, variant: estado.variant, position: 'right' },
                  ]}
                >
                  {isAudio && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Headphones size={48} strokeWidth={1.5} color="rgba(255,255,255,0.7)" />
                    </div>
                  )}
                </ImageCard>
              );
            }}
            columns={6}
            gap="1rem"
            emptyMessage={mediosFiltrados.length === 0 ? 'No hay archivos para estos filtros.' : 'Cargando...'}
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
                cell: (medio: Medio) => {
                  const isAudio = medio.tipo === 'AUDIO';
                  const urlMini = urlsMiniatura.get(medio.id);
                  return isAudio ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }}>
                      <Headphones size={20} strokeWidth={1.5} color="currentColor" />
                    </div>
                  ) : (
                    <img
                      src={urlMini || imagenProvisional(medio, 80)}
                      alt={(medio.etiquetas || [])[0] || 'Evidencia'}
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '3px' }}
                    />
                  );
                },
              },
              {
                key: 'capturadoEn',
                header: 'Fecha/Hora',
                cell: (medio: Medio) => <span>{medio.capturadoEn.toLocaleTimeString('es-MX')}</span>,
              },
              {
                key: 'bytes',
                header: 'Tamaño',
                cell: (medio: Medio) => <span>{(medio.bytes / (1024 * 1024)).toFixed(1)} MB</span>,
              },
              {
                key: 'estado',
                header: 'Estado',
                cell: (medio: Medio) => {
                  const estado = estadoProvisional(medio);
                  return <Badge variant={estado.variant}>{estado.label}</Badge>;
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
                header: 'Unidad',
                cell: (medio: Medio) => <span>{medio.placas || 'S/UNIDAD'}</span>,
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
            return medio ? resolverImagenVisor(medio, urlOriginal) : '';
          }}
        />
      )}
    </div>
  );
}