import { FilterBar } from '@ai27-tech/ui';
import { useMemo } from 'react';

import type { EstadisticaCustodio, EstadisticaUnidad } from '@/lib/datos/tipos';

import { FILTRO_VACIO, type FiltroReporte } from './filtros';

/**
 * Barra de filtros GLOBAL del reporte: buscador de texto + custodio + unidad. Es el único
 * control de filtrado de la página; gobierna las tarjetas, las gráficas y las tablas.
 *
 * Las opciones de los dropdowns se derivan de los datos GLOBALES del periodo (no de los
 * filtrados), para no perder opciones al aplicar un filtro.
 */
export interface ReporteFiltrosProps {
  filtro: FiltroReporte;
  onFiltroChange: (filtro: FiltroReporte) => void;
  custodios: EstadisticaCustodio[];
  unidades: EstadisticaUnidad[];
}

export function ReporteFiltros({
  filtro,
  onFiltroChange,
  custodios,
  unidades,
}: ReporteFiltrosProps) {
  const opcionesCustodio = useMemo(
    () => custodios.map((c) => ({ value: c.uid, label: c.nombre })),
    [custodios],
  );
  const opcionesUnidad = useMemo(
    () => unidades.map((u) => ({ value: u.placas, label: u.placas })),
    [unidades],
  );

  return (
    <FilterBar
      searchValue={filtro.texto}
      onSearchChange={(texto) => onFiltroChange({ ...filtro, texto })}
      searchPlaceholder="Buscar por custodio o placa…"
      filters={[
        { key: 'custodio', label: 'Custodio', placeholder: 'Todos', options: opcionesCustodio },
        { key: 'unidad', label: 'Unidad', placeholder: 'Todas', options: opcionesUnidad },
      ]}
      filterValues={{
        custodio: filtro.custodio ?? '',
        unidad: filtro.unidad ?? '',
      }}
      onFilterChange={(key, value) =>
        onFiltroChange({ ...filtro, [key]: value === '' ? null : value })
      }
      onClear={() => onFiltroChange(FILTRO_VACIO)}
    />
  );
}
