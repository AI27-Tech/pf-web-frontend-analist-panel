import { Card, CardBody, FormField, Input, Select } from '@ai27-tech/ui';
import { useState } from 'react';

import {
  esRangoValido,
  resolverPeriodo,
  type Atajo,
  type SeleccionPeriodo,
} from '@/lib/formato/fechas';
import type { Etiqueta, FiltrosViaje } from '@/lib/datos/tipos';

import { FiltrosActivos, type ClaveFiltroQuitable } from './FiltrosActivos';

export interface ViajesFiltersProps {
  filtros: FiltrosViaje;
  onFiltrosChange: (filtros: FiltrosViaje) => void;
  etiquetas: Etiqueta[];
  /** Números económicos del periodo, para el selector buscable. */
  placas: string[];
  /** Nombres de unidad del periodo, para el selector buscable. */
  unidades: string[];
}

const OPCIONES_PERIODO: Array<{ value: Atajo | 'rango'; label: string }> = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'rango', label: 'Rango de fechas' },
];

function omitirClave<T extends object, K extends keyof T>(objeto: T, clave: K): Omit<T, K> {
  const copia = { ...objeto };
  delete copia[clave];
  return copia;
}

/**
 * ViajesFilters (Panel_Filtros, design.md §`ViajesFilters`): los cinco controles de
 * filtro más los chips de `FiltrosActivos`. Componente controlado: recibe `filtros`
 * completo y emite `filtros` completo por `onFiltrosChange`; no lee estado global ni
 * filtra datos él mismo.
 *
 * El periodo es una `SeleccionPeriodo` (@/lib/formato/fechas) y no vive directamente
 * en `FiltrosViaje` — que sólo conoce `desde`/`hasta` ya resueltos — así que el
 * componente mantiene su propio estado local de la selección. Al montar, si
 * `filtros.desde`/`filtros.hasta` no coinciden con ningún atajo conocido, se asume
 * `{ atajo: 'rango', ... }` como estado inicial.
 */
export function ViajesFilters({
  filtros,
  onFiltrosChange,
  etiquetas,
  placas,
  unidades,
}: ViajesFiltersProps) {
  const [periodo, setPeriodo] = useState<SeleccionPeriodo>(() =>
    inferirPeriodoInicial(filtros.desde, filtros.hasta),
  );

  function manejarCambioPeriodo(valor: string) {
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

  function quitarFiltro(clave: ClaveFiltroQuitable) {
    const resto = omitirClave(filtros, clave);
    onFiltrosChange({ ...resto, page: 1 });
  }

  function limpiarTodo() {
    const nuevoPeriodo: SeleccionPeriodo = { atajo: 'mes' };
    setPeriodo(nuevoPeriodo);
    const { desde, hasta } = resolverPeriodo(nuevoPeriodo, new Date());
    onFiltrosChange({ desde, hasta, page: 1, pageSize: filtros.pageSize });
  }

  const rangoInvalido = periodo.atajo === 'rango' && !esRangoValido(periodo.desde, periodo.hasta);

  return (
    // El `Card` de la librería trae `overflow: hidden` (para recortar sus esquinas
    // redondeadas), y el desplegable del `Select` es `position: absolute` en el flujo,
    // no en un portal. Sin esto, la lista de opciones se recorta al borde de la tarjeta
    // (se ve en Viajes, no en Galería, que no envuelve sus filtros en un Card). Se fuerza
    // `overflow-visible` para que el desplegable escape la tarjeta.
    <Card variant="outlined" className="!overflow-visible">
      <CardBody className="flex flex-wrap items-end gap-4 !overflow-visible">
        <FormField label="Periodo">
          <Select
            options={OPCIONES_PERIODO.map((opcion) => ({
              value: opcion.value,
              label: opcion.label,
            }))}
            value={periodo.atajo}
            onChange={(valor) => manejarCambioPeriodo(String(valor))}
          />
        </FormField>

        {periodo.atajo === 'rango' && (
          <>
            <FormField label="Desde">
              <Input
                type="date"
                value={periodo.desde}
                invalid={rangoInvalido}
                onChange={(evento) => manejarCambioRango('desde', evento.target.value)}
              />
            </FormField>
            <FormField label="Hasta">
              <Input
                type="date"
                value={periodo.hasta}
                invalid={rangoInvalido}
                onChange={(evento) => manejarCambioRango('hasta', evento.target.value)}
              />
            </FormField>
          </>
        )}

        <FormField label="Número económico">
          <Select
            variant="searchable"
            searchPlaceholder="Buscar número económico..."
            options={opcionesConVigente(placas, filtros.placas)}
            value={filtros.placas ?? ''}
            onChange={(valor) => manejarCambioCriterio('placas', String(valor))}
          />
        </FormField>

        <FormField label="Unidad">
          <Select
            variant="searchable"
            searchPlaceholder="Buscar unidad..."
            options={opcionesConVigente(unidades, filtros.custodioName)}
            value={filtros.custodioName ?? ''}
            onChange={(valor) => manejarCambioCriterio('custodioName', String(valor))}
          />
        </FormField>

        <div className="basis-full">
          <FiltrosActivos
            filtros={filtros}
            etiquetas={etiquetas}
            onQuitarFiltro={quitarFiltro}
            onLimpiarTodo={limpiarTodo}
          />
        </div>
      </CardBody>
    </Card>
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
