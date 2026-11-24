import { DateInput, FormField, Inline } from '@ai27-tech/ui';
import { esRangoValido, fechaLocalDe, type SeleccionPeriodo } from '@/lib/formato/fechas';

/**
 * Atajos de periodo del reporte: Hoy, Esta semana, Este mes y Rango. Al elegir Rango aparecen dos
 * campos de fecha; los tres atajos son cálculos de calendario (ver `lib/formato/fechas`).
 */

export interface SelectorPeriodoProps {
  seleccion: SeleccionPeriodo;
  onChange: (seleccion: SeleccionPeriodo) => void;
}

const ATAJOS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'rango', label: 'Rango' },
] as const;

/** Hoy en zona de México, como valor por defecto de los campos al abrir Rango.
 *  Usa `fechaLocalDe` y NO `toISOString()`: este último da el día en UTC, que después de
 *  las 18:00 hora de México ya es el día siguiente, y abriría el rango en una fecha que
 *  no es «hoy» para el analista. */
function hoyISO(): string {
  return fechaLocalDe(new Date());
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
    <Inline gap={2} align="center">
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
        <Inline gap={2} align="end">
          <FormField label="Desde">
            <DateInput
              value={desde}
              max={hasta}
              onChange={(valor) => onChange({ atajo: 'rango', desde: valor, hasta })}
            />
          </FormField>
          <FormField label="Hasta">
            <DateInput
              value={hasta}
              min={desde}
              onChange={(valor) => onChange({ atajo: 'rango', desde, hasta: valor })}
            />
          </FormField>
          {rangoInvalido && (
            <span className="text-danger text-xs" role="alert">
              La fecha inicial no puede ser posterior a la final.
            </span>
          )}
        </Inline>
      )}
    </Inline>
  );
}
