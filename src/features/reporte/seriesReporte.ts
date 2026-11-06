/**
 * Series de las gráficas del modal «Reportes». Es lógica pura: reciben lo que ya tiene el
 * modal y devuelven un punto por cada día del periodo, con ceros donde no hubo actividad,
 * para que el eje del tiempo no tenga huecos.
 *
 * Cada serie sale de los MISMOS datos que su CSV, para que la gráfica y el archivo
 * cuenten lo mismo: los archivos del reporte de unidad, y el registro por viaje de la
 * actividad por día.
 */

import type { FilaViaje, Medio } from '@/lib/datos/tipos';
import type { RangoFechas } from '@/lib/formato/fechas';

import { diasDelRango } from './reportesCsv';

/** Archivos que subió la unidad en un día, separados por tipo. */
export interface PuntoArchivosDia {
  dia: string;
  fotos: number;
  audios: number;
}

/** Viajes de un día. */
export interface PuntoViajesDia {
  dia: string;
  viajes: number;
}

/**
 * Fotos y audios por día de la unidad. Un archivo cuenta en su `fechaLocal`, la misma
 * fecha que lleva el CSV. Los archivos fuera del rango se ignoran.
 */
export function archivosPorDia(medios: Medio[], rango: RangoFechas): PuntoArchivosDia[] {
  const porDia = new Map<string, PuntoArchivosDia>(
    diasDelRango(rango).map((dia) => [dia, { dia, fotos: 0, audios: 0 }]),
  );

  for (const m of medios) {
    const punto = porDia.get(m.fechaLocal);
    if (!punto) continue;
    if (m.tipo === 'FOTO') punto.fotos += 1;
    else punto.audios += 1;
  }

  return [...porDia.values()];
}

/**
 * Viajes por día. Un viaje cuenta en su `fechaLocal` (el día en que se abrió), igual que
 * en el CSV de actividad por día. Los viajes fuera del rango se ignoran.
 */
export function viajesPorDia(porViaje: FilaViaje[], rango: RangoFechas): PuntoViajesDia[] {
  const porDia = new Map<string, PuntoViajesDia>(
    diasDelRango(rango).map((dia) => [dia, { dia, viajes: 0 }]),
  );

  for (const v of porViaje) {
    const punto = porDia.get(v.fechaLocal);
    if (!punto) continue;
    punto.viajes += 1;
  }

  return [...porDia.values()];
}
