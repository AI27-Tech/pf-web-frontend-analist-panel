import { esRangoValido, type SeleccionPeriodo } from '@/lib/formato/fechas';

/**
 * Atajos de periodo del reporte: Hoy, Semana, Mes y Rango. Al elegir Rango aparecen dos
 * campos de fecha; los tres atajos son cálculos de calendario (ver `lib/formato/fechas`).
 */

export interface SelectorPeriodoProps {
  seleccion: SeleccionPeriodo;
  onChange: (seleccion: SeleccionPeriodo) => void;
}

const ATAJOS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'rango', label: 'Rango' },
] as const;

/** Hoy en zona local, como valor por defecto de los campos al abrir Rango. */
function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SelectorPeriodo({ seleccion, onChange }: SelectorPeriodoProps) {
  const esRango = seleccion.atajo === 'rango';
  const desde = esRango ? seleccion.desde : hoyISO();
  const hasta = esRango ? seleccion.hasta : hoyISO();
  const rangoInvalido = esRango && !esRangoValido(desde, hasta);

  function elegirAtajo(id: (typeof ATAJOS)[number]['id']): void {
    if (id === 'rango') {
      onChange({ atajo: 'rango', desde, hasta });
    } else {
      onChange({ atajo: id });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Periodo del reporte"
        className="border-border flex items-center gap-0.5 rounded-md border p-0.5"
      >
        {ATAJOS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => elegirAtajo(id)}
            aria-pressed={seleccion.atajo === id}
            className={
              seleccion.atajo === id
                ? 'bg-accent text-on-accent rounded px-3 py-1 text-sm font-medium'
                : 'text-text-muted hover:text-text rounded px-3 py-1 text-sm'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {esRango && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5">
            <span className="text-text-muted text-xs">Desde</span>
            <input
              type="date"
              value={desde}
              max={hasta}
              aria-label="Fecha desde"
              onChange={(event) => onChange({ atajo: 'rango', desde: event.target.value, hasta })}
              className="border-border bg-surface text-text rounded-md border px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-text-muted text-xs">Hasta</span>
            <input
              type="date"
              value={hasta}
              min={desde}
              aria-label="Fecha hasta"
              onChange={(event) => onChange({ atajo: 'rango', desde, hasta: event.target.value })}
              className="border-border bg-surface text-text rounded-md border px-2 py-1 text-sm"
            />
          </label>
          {rangoInvalido && (
            <span className="text-danger text-xs" role="alert">
              La fecha inicial no puede ser posterior a la final.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
