/**
 * Cálculo de rangos de fecha para los filtros y el reporte.
 *
 * Todo opera sobre `fechaLocal`, la cadena `YYYY-MM-DD` que la app escribe en zona de
 * México. Filtrar y agrupar sobre esa cadena es lo que evita que el resultado dependa
 * de la zona horaria de quien consulta, que es la razón por la que ese campo existe
 * (pf-app-custodio/docs/PLAN.md §5.1).
 */

const ZONA = 'America/Mexico_City';

/** Devuelve la fecha local de México como `YYYY-MM-DD`. */
export function fechaLocalDe(instante: Date): string {
  // `en-CA` formatea como YYYY-MM-DD, que es justo la forma que usa `fechaLocal`.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

export type Atajo = 'hoy' | 'semana' | 'mes';

export interface RangoFechas {
  desde: string;
  hasta: string;
}

/** Suma días a una fecha `YYYY-MM-DD` sin tocar zonas horarias: la aritmética se hace
 *  en UTC sobre una fecha sin hora, donde no hay horario de verano que la desvíe. */
function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** Día de la semana de una fecha `YYYY-MM-DD`, con lunes = 0. */
function diaDeSemanaDesdeLunes(fecha: string): number {
  const domingoEsCero = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return (domingoEsCero + 6) % 7;
}

/**
 * Rango de un atajo, calculado sobre el calendario y no sobre ventanas móviles.
 *
 * `semana` va del lunes de la semana en curso a hoy, y `mes` del día primero a hoy,
 * porque los entregables del analista son el corte semanal y el mensual. Una ventana
 * de "últimos 7 días" daría un número distinto al del reporte que entrega.
 */
export function rangoDeAtajo(atajo: Atajo, ahora: Date = new Date()): RangoFechas {
  const hoy = fechaLocalDe(ahora);

  switch (atajo) {
    case 'hoy':
      return { desde: hoy, hasta: hoy };
    case 'semana':
      return { desde: sumarDias(hoy, -diaDeSemanaDesdeLunes(hoy)), hasta: hoy };
    case 'mes':
      return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
  }
}
