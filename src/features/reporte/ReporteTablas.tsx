import { Button, type SortState } from '@ai27-tech/ui';
import { useNavigate } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { EstadisticaCustodio, FilaViaje } from '@/lib/datos/tipos';

import { TablaCustodios } from './TablaCustodios';
import { TablaViajes } from './TablaViajes';

/**
 * Orquesta las dos tablas del reporte: «Estadísticas por custodio» y «Registro por
 * viaje». Mantiene el estado de orden de cada tabla y el filtro cruzado por custodio.
 *
 * El ordenamiento es CONTROLADO por la `Table` de la librería (recibe `sort` y emite
 * `onSortChange`), así que aquí se ordena la copia de los datos antes de pasarla. El
 * filtro cruzado es estado local, no se persiste (consideración 6.2 de la HU).
 */
export interface ReporteTablasProps {
  porCustodio: EstadisticaCustodio[];
  porViaje: FilaViaje[];
}

/** Valor de una columna de custodio para ordenar. `totalMedios` es derivado. */
function custodioSortValue(c: EstadisticaCustodio, key: string): number | string {
  switch (key) {
    case 'nombre':
      return c.nombre.toLowerCase();
    case 'totalMedios':
      return c.fotos + c.audios;
    case 'viajes':
      return c.viajes;
    case 'fotos':
      return c.fotos;
    case 'audios':
      return c.audios;
    default:
      return c.nombre.toLowerCase();
  }
}

/** Valor de una columna de viaje para ordenar. */
function viajeSortValue(v: FilaViaje, key: string): number | string {
  switch (key) {
    case 'totalMedios':
      return v.fotos + v.audios;
    case 'fotos':
      return v.fotos;
    case 'audios':
      return v.audios;
    case 'placas':
      return v.placas.toLowerCase();
    case 'ciclo':
      return v.ciclo;
    case 'id':
      return v.id;
    case 'fechaLocal':
    default:
      return v.fechaLocal;
  }
}

/** Ordena una copia de `data` según `sort`, usando `valueOf` para extraer la clave. */
function sortBy<T>(
  data: T[],
  sort: SortState,
  valueOf: (row: T, key: string) => number | string,
): T[] {
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...data].sort((a, b) => {
    const va = valueOf(a, sort.key);
    const vb = valueOf(b, sort.key);
    if (va < vb) return -1 * factor;
    if (va > vb) return 1 * factor;
    return 0;
  });
}

export function ReporteTablas({ porCustodio, porViaje }: ReporteTablasProps) {
  const navigate = useNavigate();

  // Orden por defecto de custodios: total de medios descendente (criterio de aceptación
  // #1). El de viajes: fecha descendente.
  const [sortCustodios, setSortCustodios] = useState<SortState>({
    key: 'totalMedios',
    direction: 'desc',
  });
  const [sortViajes, setSortViajes] = useState<SortState>({
    key: 'fechaLocal',
    direction: 'desc',
  });

  const [custodioSeleccionado, setCustodioSeleccionado] = useState<string | null>(null);

  const custodiosOrdenados = useMemo(
    () => sortBy(porCustodio, sortCustodios, custodioSortValue),
    [porCustodio, sortCustodios],
  );

  // Nombre del custodio seleccionado, para el filtro: `FilaViaje.custodios` guarda
  // nombres resueltos, no uids, así que el cruce se hace por nombre.
  const nombreSeleccionado = useMemo(
    () => porCustodio.find((c) => c.uid === custodioSeleccionado)?.nombre ?? null,
    [porCustodio, custodioSeleccionado],
  );

  const viajesFiltrados = useMemo(() => {
    const base = nombreSeleccionado
      ? porViaje.filter((v) => v.custodios.includes(nombreSeleccionado))
      : porViaje;
    return sortBy(base, sortViajes, viajeSortValue);
  }, [porViaje, nombreSeleccionado, sortViajes]);

  /** Alterna la selección: volver a hacer clic en el mismo custodio limpia el filtro. */
  function alternarCustodio(uid: string): void {
    setCustodioSeleccionado((previo) => (previo === uid ? null : uid));
  }

  return (
    <div className="space-y-8">
      {/* Estadísticas por custodio */}
      <section aria-labelledby="custodios-titulo" className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="bg-surface-high text-text-muted rounded px-2 py-0.5 font-mono text-xs">
            02
          </span>
          <div>
            <h2 id="custodios-titulo" className="text-text text-sm font-semibold">
              Estadísticas por custodio
            </h2>
            <p className="text-text-muted text-xs">
              Actividad de cada custodio en el periodo. Selecciona una fila para filtrar el registro
              por viaje.
            </p>
          </div>
        </div>

        <TablaCustodios
          datos={custodiosOrdenados}
          sort={sortCustodios}
          onSortChange={setSortCustodios}
          seleccionado={custodioSeleccionado}
          onSeleccionar={alternarCustodio}
        />
      </section>

      {/* Registro por viaje */}
      <section aria-labelledby="viajes-titulo" className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="bg-surface-high text-text-muted rounded px-2 py-0.5 font-mono text-xs">
            03
          </span>
          <div className="flex-1">
            <h2 id="viajes-titulo" className="text-text text-sm font-semibold">
              Registro por viaje
            </h2>
            <p className="text-text-muted text-xs">
              Un renglón por viaje del periodo. Haz clic en un viaje para abrir su expediente.
            </p>
          </div>
          {nombreSeleccionado && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustodioSeleccionado(null)}
              startIcon={<X size={14} strokeWidth={1.75} />}
            >
              {nombreSeleccionado}
            </Button>
          )}
        </div>

        <TablaViajes
          datos={viajesFiltrados}
          sort={sortViajes}
          onSortChange={setSortViajes}
          onAbrirViaje={(id) => void navigate({ to: '/viajes/$id', params: { id } })}
        />
      </section>
    </div>
  );
}
