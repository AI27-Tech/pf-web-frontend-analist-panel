import { FilterBar } from '@ai27-tech/ui';
import { useMemo } from 'react';

import type { Envio, EstadisticaCustodio, EstadisticaUnidad } from '@/lib/datos/tipos';

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
  /** Envíos del rol para el dropdown «Envío», del más reciente al más antiguo. */
  envios: Envio[];
  /** Shipment ID elegido, o cadena vacía si ninguno. */
  envioSeleccionado: string;
  onEnvioChange: (shipmentId: string) => void;
}

export function ReporteFiltros({
  filtro,
  onFiltroChange,
  custodios,
  unidades,
  envios,
  envioSeleccionado,
  onEnvioChange,
}: ReporteFiltrosProps) {
  const opcionesCustodio = useMemo(
    () => custodios.map((c) => ({ value: c.uid, label: c.nombre })),
    [custodios],
  );
  const opcionesUnidad = useMemo(
    () => unidades.map((u) => ({ value: u.placas, label: u.placas })),
    [unidades],
  );
  const opcionesEnvio = useMemo(
    () => envios.map((e) => ({ value: e.shipmentId, label: e.shipmentId })),
    [envios],
  );

  return (
    <FilterBar
      searchValue={filtro.texto}
      onSearchChange={(texto) => onFiltroChange({ ...filtro, texto })}
      searchPlaceholder="Buscar por unidad o número económico…"
      filters={[
        {
          key: 'custodio',
          label: 'Unidad',
          placeholder: 'Todas',
          variant: 'searchable',
          options: opcionesCustodio,
        },
        {
          key: 'unidad',
          label: 'Número económico',
          placeholder: 'Todos',
          variant: 'searchable',
          options: opcionesUnidad,
        },
        {
          key: 'envio',
          label: 'Envío',
          placeholder: 'Ninguno',
          variant: 'searchable',
          options: opcionesEnvio,
        },
      ]}
      filterValues={{
        custodio: filtro.custodio ?? '',
        unidad: filtro.unidad ?? '',
        envio: envioSeleccionado,
      }}
      onFilterChange={(key, value) => {
        if (key === 'envio') {
          onEnvioChange(value);
          return;
        }
        onFiltroChange({ ...filtro, [key]: value === '' ? null : value });
      }}
      onClear={() => {
        onFiltroChange(FILTRO_VACIO);
        onEnvioChange('');
      }}
      collapsibleOnMobile
    />
  );
}
