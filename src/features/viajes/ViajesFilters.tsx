import { DateInput, FilterBar, FormField, Grid, Stack, type FilterDefinition } from '@ai27-tech/ui';
import { useState } from 'react';

import {
  esRangoValido,
  resolverPeriodo,
  type Atajo,
  type SeleccionPeriodo,
} from '@/lib/formato/fechas';
import type { FiltrosViaje } from '@/lib/datos/tipos';

export interface ViajesFiltersProps {
  filtros: FiltrosViaje;
  onFiltrosChange: (filtros: FiltrosViaje) => void;
  /** Números económicos del periodo, para el selector buscable. */
  placas: string[];
  /** Nombres de unidad del periodo, para el selector buscable. */
  unidades: string[];
}

// «Este mes» es el periodo por defecto: se representa con valor vacío para que FilterBar no lo
// cuente como filtro activo (ni muestre su chip) mientras el analista no cambie de periodo.
const OPCIONES_PERIODO = [
  { value: '', label: 'Este mes' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'rango', label: 'Rango de fechas' },
];

function omitirClave<T extends object, K extends keyof T>(objeto: T, clave: K): Omit<T, K> {
  const copia = { ...objeto };
  delete copia[clave];
  return copia;
}

/**
 * ViajesFilters (Panel_Filtros, design.md §`ViajesFilters`): periodo, número económico y
 * unidad sobre `FilterBar` (que además dibuja los chips de filtros activos y en móvil guarda
 * los filtros tras un botón). Componente controlado: recibe `filtros`
 * completo y emite `filtros` completo por `onFiltrosChange`; no lee estado global ni
 * filtra datos él mismo.
 *
 * El periodo es una `SeleccionPeriodo` (@/lib/formato/fechas) y no vive directamente
 * en `FiltrosViaje` — que sólo conoce `desde`/`hasta` ya resueltos — así que el
 * componente mantiene su propio estado local de la selección. Al montar, si
 * `filtros.desde`/`filtros.hasta` no coinciden con ningún atajo conocido, se asume
 * `{ atajo: 'rango', ... }` como estado inicial.
 */
export function ViajesFilters({ filtros, onFiltrosChange, placas, unidades }: ViajesFiltersProps) {
  const [periodo, setPeriodo] = useState<SeleccionPeriodo>(() =>
    inferirPeriodoInicial(filtros.desde, filtros.hasta),
  );

  function manejarCambioPeriodo(valorFilterBar: string) {
    const valor = valorFilterBar === '' ? 'mes' : valorFilterBar;
    if (valor === 'rango') {
      // El rango vigente se conserva como valor inicial de los dos `Input` de fecha.
      setPeriodo({ atajo: 'rango', desde: filtros.desde, hasta: filtros.hasta });
      return;
    }

    const atajo = valor as Atajo;
    const nuevoPeriodo: SeleccionPeriodo = { atajo };
    setPeriodo(nuevoPeriodo);
    const { desde, hasta } = resolverPeriodo(nuevoPeriodo, new Date());
    onFiltrosChange({ ...filtros, desde, hasta, page: 1 });
  }

  function manejarCambioRango(campo: 'desde' | 'hasta', valor: string) {
    if (periodo.atajo !== 'rango') {
      return;
    }
    const nuevoPeriodo: SeleccionPeriodo = { ...periodo, [campo]: valor };
    setPeriodo(nuevoPeriodo);

    if (esRangoValido(nuevoPeriodo.desde, nuevoPeriodo.hasta)) {
      onFiltrosChange({
        ...filtros,
        desde: nuevoPeriodo.desde,
        hasta: nuevoPeriodo.hasta,
        page: 1,
      });
    }
    // Si el rango es inválido, no se emite: la lista sigue mostrando el último rango
    // válido.
  }

  // Cambiar un selector reemplaza su criterio; elegir la opción vacía lo quita.
  function manejarCambioCriterio(clave: 'placas' | 'custodioName', valor: string) {
    const resto = omitirClave(filtros, clave);
    onFiltrosChange({ ...resto, ...(valor ? { [clave]: valor } : {}), page: 1 });
  }

  // Las opciones salen del periodo. Si el criterio vigente no está entre ellas (por ejemplo,
  // tras cambiar de periodo), se agrega para que el selector no pierda su valor.
  function opcionesConVigente(lista: string[], vigente: string | undefined) {
    const nombres = vigente && !lista.includes(vigente) ? [...lista, vigente] : lista;
    return [
      { value: '', label: 'Todos' },
      ...nombres.map((nombre) => ({ value: nombre, label: nombre })),
    ];
  }

  function limpiarTodo() {
    const nuevoPeriodo: SeleccionPeriodo = { atajo: 'mes' };
    setPeriodo(nuevoPeriodo);
    const { desde, hasta } = resolverPeriodo(nuevoPeriodo, new Date());
    onFiltrosChange({ desde, hasta, page: 1, pageSize: filtros.pageSize });
  }

  const rangoInvalido = periodo.atajo === 'rango' && !esRangoValido(periodo.desde, periodo.hasta);

  const definiciones: FilterDefinition[] = [
    { key: 'periodo', label: 'Periodo', options: OPCIONES_PERIODO },
    {
      key: 'placas',
      label: 'Número económico',
      placeholder: 'Todos',
      variant: 'searchable',
      searchPlaceholder: 'Buscar número económico...',
      options: opcionesConVigente(placas, filtros.placas),
    },
    {
      key: 'custodioName',
      label: 'Unidad',
      placeholder: 'Todos',
      variant: 'searchable',
      searchPlaceholder: 'Buscar unidad...',
      options: opcionesConVigente(unidades, filtros.custodioName),
    },
  ];

  function manejarCambioFiltro(clave: string, valor: string) {
    if (clave === 'periodo') {
      manejarCambioPeriodo(valor);
    } else if (clave === 'placas' || clave === 'custodioName') {
      manejarCambioCriterio(clave, valor);
    }
  }

  return (
    <Stack gap={3}>
      <FilterBar
        filters={definiciones}
        filterValues={{
          periodo: periodo.atajo === 'mes' ? '' : periodo.atajo,
          placas: filtros.placas ?? '',
          custodioName: filtros.custodioName ?? '',
        }}
        onFilterChange={manejarCambioFiltro}
        onClear={limpiarTodo}
        collapsibleOnMobile
      />
      {periodo.atajo === 'rango' && (
        <Grid gap={4} minItemWidth="14rem">
          <FormField label="Desde">
            <DateInput
              value={periodo.desde}
              invalid={rangoInvalido}
              onChange={(valor) => manejarCambioRango('desde', valor)}
            />
          </FormField>
          <FormField label="Hasta">
            <DateInput
              value={periodo.hasta}
              invalid={rangoInvalido}
              onChange={(valor) => manejarCambioRango('hasta', valor)}
            />
          </FormField>
        </Grid>
      )}
    </Stack>
  );
}
/**
 * Estado inicial del periodo a partir de `desde`/`hasta` vigentes. Si el rango no
 * coincide con ninguno de los tres atajos calculados para "ahora", se asume que es un
 * rango explícito del analista.
 */
function inferirPeriodoInicial(desde: string, hasta: string): SeleccionPeriodo {
  const ahora = new Date();
  const atajos: Atajo[] = ['hoy', 'semana', 'mes'];
  for (const atajo of atajos) {
    const rango = resolverPeriodo({ atajo }, ahora);
    if (rango.desde === desde && rango.hasta === hasta) {
      return { atajo };
    }
  }
  return { atajo: 'rango', desde, hasta };
}
