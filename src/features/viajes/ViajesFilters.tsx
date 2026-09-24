import { Card, CardBody, FormField, Input, Select } from '@ai27-tech/ui';
import { useEffect, useRef, useState } from 'react';

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
}

const OPCIONES_PERIODO: Array<{ value: Atajo | 'rango'; label: string }> = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'rango', label: 'Rango de fechas' },
];

const DEBOUNCE_MS = 300;

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
export function ViajesFilters({ filtros, onFiltrosChange, etiquetas }: ViajesFiltersProps) {
  const [periodo, setPeriodo] = useState<SeleccionPeriodo>(() =>
    inferirPeriodoInicial(filtros.desde, filtros.hasta),
  );

  const [placasTexto, setPlacasTexto] = useState(filtros.placas ?? '');
  const [custodioTexto, setCustodioTexto] = useState(filtros.custodioName ?? '');

  const timeoutPlacas = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const timeoutCustodio = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutPlacas.current);
      clearTimeout(timeoutCustodio.current);
    };
  }, []);

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

  function manejarCambioPlacas(valor: string) {
    setPlacasTexto(valor);
    clearTimeout(timeoutPlacas.current);
    timeoutPlacas.current = setTimeout(() => {
      const texto = valor.trim();
      const resto = omitirClave(filtros, 'placas');
      onFiltrosChange({ ...resto, ...(texto ? { placas: texto } : {}), page: 1 });
    }, DEBOUNCE_MS);
  }

  function manejarCambioCustodio(valor: string) {
    setCustodioTexto(valor);
    clearTimeout(timeoutCustodio.current);
    timeoutCustodio.current = setTimeout(() => {
      const texto = valor.trim();
      const resto = omitirClave(filtros, 'custodioName');
      onFiltrosChange({ ...resto, ...(texto ? { custodioName: texto } : {}), page: 1 });
    }, DEBOUNCE_MS);
  }

  function manejarCambioEtiqueta(valor: string) {
    const resto = omitirClave(filtros, 'etiqueta');
    onFiltrosChange({
      ...resto,
      ...(valor ? { etiqueta: valor } : {}),
      page: 1,
    });
  }

  function manejarCambioNovedad(valor: string) {
    const resto = omitirClave(filtros, 'isUpdated');
    if (valor === '') {
      onFiltrosChange({ ...resto, page: 1 });
      return;
    }
    onFiltrosChange({ ...resto, isUpdated: valor === 'true', page: 1 });
  }

  function quitarFiltro(clave: ClaveFiltroQuitable) {
    const resto = omitirClave(filtros, clave);
    if (clave === 'placas') {
      setPlacasTexto('');
    }
    if (clave === 'custodioName') {
      setCustodioTexto('');
    }
    onFiltrosChange({ ...resto, page: 1 });
  }

  function limpiarTodo() {
    clearTimeout(timeoutPlacas.current);
    clearTimeout(timeoutCustodio.current);
    setPlacasTexto('');
    setCustodioTexto('');
    const nuevoPeriodo: SeleccionPeriodo = { atajo: 'mes' };
    setPeriodo(nuevoPeriodo);
    const { desde, hasta } = resolverPeriodo(nuevoPeriodo, new Date());
    onFiltrosChange({ desde, hasta, page: 1, pageSize: filtros.pageSize });
  }

  const rangoInvalido = periodo.atajo === 'rango' && !esRangoValido(periodo.desde, periodo.hasta);

  return (
    <Card variant="outlined">
      <CardBody className="flex flex-wrap items-end gap-4">
        <FormField label={<RotuloFiltro texto="FECHA [PERIODO]" />}>
          <Select
            options={OPCIONES_PERIODO.map((opcion) => ({
              value: opcion.value,
              label: opcion.label,
            }))}
            value={periodo.atajo}
            onChange={(evento) => manejarCambioPeriodo(evento.target.value)}
          />
        </FormField>

        {periodo.atajo === 'rango' && (
          <>
            <FormField label={<RotuloFiltro texto="DESDE" />}>
              <Input
                type="date"
                value={periodo.desde}
                invalid={rangoInvalido}
                onChange={(evento) => manejarCambioRango('desde', evento.target.value)}
              />
            </FormField>
            <FormField label={<RotuloFiltro texto="HASTA" />}>
              <Input
                type="date"
                value={periodo.hasta}
                invalid={rangoInvalido}
                onChange={(evento) => manejarCambioRango('hasta', evento.target.value)}
              />
            </FormField>
          </>
        )}

        <FormField label={<RotuloFiltro texto="PLACA [UNIDAD]" />}>
          <Input
            type="text"
            placeholder="Todas las placas"
            value={placasTexto}
            onChange={(evento) => manejarCambioPlacas(evento.target.value)}
          />
        </FormField>

        <FormField label={<RotuloFiltro texto="CUSTODIO [AGENTE]" />}>
          <Input
            type="text"
            placeholder="Todos los custodios"
            value={custodioTexto}
            onChange={(evento) => manejarCambioCustodio(evento.target.value)}
          />
        </FormField>

        <FormField label={<RotuloFiltro texto="ETIQUETA [TAG]" />}>
          <Select
            options={[
              { value: '', label: 'Cualquier etiqueta' },
              ...etiquetas.map((etiqueta) => ({ value: etiqueta.id, label: etiqueta.nombre })),
            ]}
            value={filtros.etiqueta ?? ''}
            onChange={(evento) => manejarCambioEtiqueta(evento.target.value)}
          />
        </FormField>

        <FormField label={<RotuloFiltro texto="NOVEDAD [STATUS]" />}>
          <Select
            options={[
              { value: '', label: 'Todas las novedades' },
              { value: 'true', label: 'Con novedad' },
              { value: 'false', label: 'Sin novedad' },
            ]}
            value={filtros.isUpdated === undefined ? '' : String(filtros.isUpdated)}
            onChange={(evento) => manejarCambioNovedad(evento.target.value)}
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

function RotuloFiltro({ texto }: { texto: string }) {
  return <span className="font-mono text-xs tracking-widest uppercase">{texto}</span>;
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
