import { Badge, Button } from '@ai27-tech/ui';
import { X } from 'lucide-react';

import type { Etiqueta, FiltrosViaje } from '@/lib/datos/tipos';

/**
 * Claves de `FiltrosViaje` que se pueden quitar desde un chip.
 */
export type ClaveFiltroQuitable = 'placas' | 'custodioName' | 'etiqueta' | 'isUpdated';

export interface FiltrosActivosProps {
  filtros: FiltrosViaje;
  /** Para mostrar el nombre de la etiqueta en el chip. */
  etiquetas: Etiqueta[];
  onQuitarFiltro: (clave: ClaveFiltroQuitable) => void;
  onLimpiarTodo: () => void;
}

/**
 * FiltrosActivos: la fila de chips por criterio activo, distinto del periodo, más el
 * control «Limpiar todo».
 */
export function FiltrosActivos({
  filtros,
  etiquetas,
  onQuitarFiltro,
  onLimpiarTodo,
}: FiltrosActivosProps) {
  const hayNovedadFiltro = filtros.isUpdated !== undefined;
  const hayAlgunCriterio =
    filtros.placas !== undefined ||
    filtros.custodioName !== undefined ||
    filtros.etiqueta !== undefined ||
    hayNovedadFiltro;

  if (!hayAlgunCriterio) {
    return null;
  }

  const nombreEtiqueta =
    filtros.etiqueta !== undefined
      ? (etiquetas.find((etiqueta) => etiqueta.id === filtros.etiqueta)?.nombre ?? filtros.etiqueta)
      : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-text-muted font-mono text-xs tracking-widest uppercase">
        Filtros activos:
      </span>

      {filtros.placas !== undefined && (
        <ChipFiltro
          rotulo={`Número económico: ${filtros.placas}`}
          ariaLabel="Quitar filtro de número económico"
          onQuitar={() => onQuitarFiltro('placas')}
        />
      )}

      {filtros.custodioName !== undefined && (
        <ChipFiltro
          rotulo={`Unidad: ${filtros.custodioName}`}
          ariaLabel="Quitar filtro de unidad"
          onQuitar={() => onQuitarFiltro('custodioName')}
        />
      )}

      {filtros.etiqueta !== undefined && (
        <ChipFiltro
          rotulo={`Etiqueta: ${nombreEtiqueta}`}
          ariaLabel="Quitar filtro de etiqueta"
          onQuitar={() => onQuitarFiltro('etiqueta')}
        />
      )}

      {hayNovedadFiltro && (
        <ChipFiltro
          rotulo={filtros.isUpdated ? 'Novedad: Con novedad' : 'Novedad: Sin novedad'}
          ariaLabel="Quitar filtro de novedad"
          onQuitar={() => onQuitarFiltro('isUpdated')}
        />
      )}

      <Button variant="ghost" size="sm" onClick={onLimpiarTodo}>
        Limpiar todo
      </Button>
    </div>
  );
}

interface ChipFiltroProps {
  rotulo: string;
  ariaLabel: string;
  onQuitar: () => void;
}

/** Un chip individual: `Badge pill` con su rótulo y un botón de cierre pequeño. */
function ChipFiltro({ rotulo, ariaLabel, onQuitar }: ChipFiltroProps) {
  return (
    <Badge pill className="flex items-center gap-1 pr-1">
      {rotulo}
      <Button
        variant="ghost"
        size="sm"
        aria-label={ariaLabel}
        onClick={onQuitar}
        className="size-4 p-0"
      >
        <X className="size-3" aria-hidden="true" />
      </Button>
    </Badge>
  );
}
