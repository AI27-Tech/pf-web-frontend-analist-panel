import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FilaViaje } from '@/lib/datos/tipos';

import { descargarArchivo, nombreArchivoCsv, viajesACsv } from './exportarCsv';
import { FILTRO_VACIO } from './filtros';

function viaje(parcial: Partial<FilaViaje> = {}): FilaViaje {
  return {
    id: 'v1',
    placas: 'ABC-123',
    custodios: ['Jesús Pérez'],
    fechaLocal: '2026-09-01',
    fotos: 5,
    audios: 1,
    ciclo: 'CERRADO',
    hayNovedad: false,
    ...parcial,
  };
}

/** Separa el CSV en líneas; las pruebas con saltos internos no usan este helper. */
function lineas(csv: string): string[] {
  return csv.split('\r\n');
}

describe('viajesACsv', () => {
  it('escribe los encabezados en el orden esperado y una fila por viaje', () => {
    const csv = viajesACsv([viaje(), viaje({ id: 'v2', ciclo: 'ACTIVO', fotos: 0, audios: 2 })]);
    expect(lineas(csv)).toEqual([
      'Unidad,Numero economico,Fecha,Cantidad de fotos,Cantidad de audios,Total de validaciones,Estado',
      'Jesús Pérez,ABC-123,2026-09-01,5,1,6,Cerrado',
      'Jesús Pérez,ABC-123,2026-09-01,0,2,2,Activo',
    ]);
  });

  it('etiqueta los tres ciclos', () => {
    const csv = viajesACsv([
      viaje({ ciclo: 'ACTIVO' }),
      viaje({ ciclo: 'CERRADO' }),
      viaje({ ciclo: 'DESCARTADO' }),
    ]);
    expect(lineas(csv).map((l) => l.split(',').at(-1))).toEqual([
      'Estado',
      'Activo',
      'Cerrado',
      'Descartado',
    ]);
  });

  it('respeta el orden recibido', () => {
    const csv = viajesACsv([viaje({ placas: 'B' }), viaje({ placas: 'A' })]);
    expect(
      lineas(csv)
        .slice(1)
        .map((l) => l.split(',')[1]),
    ).toEqual(['B', 'A']);
  });

  it('escapa comas, comillas dobles y saltos de línea', () => {
    const csv = viajesACsv([
      viaje({ placas: 'A,B', custodios: ['Dijo "hola"', 'Línea1\nLínea2'] }),
    ]);
    expect(csv).toContain('"A,B"');
    expect(csv).toContain('"Dijo ""hola"" | Línea1\nLínea2"');
  });

  it.each(['=SUMA(A1:A2)', '+1', '-1', '@x'])('neutraliza la fórmula %s', (valor) => {
    const csv = viajesACsv([viaje({ custodios: [valor] })]);
    // La celda ya no empieza con el carácter de fórmula: lleva un apóstrofo delante
    // (y papaparse la entrecomilla).
    expect(lineas(csv)[1]).toBe(`"'${valor}",ABC-123,2026-09-01,5,1,6,Cerrado`);
  });

  it('viaje sin custodios deja la celda vacía', () => {
    const csv = viajesACsv([viaje({ custodios: [] })]);
    expect(lineas(csv)[1]).toBe(',ABC-123,2026-09-01,5,1,6,Cerrado');
  });

  it('viaje con varios custodios los une con " | "', () => {
    const csv = viajesACsv([viaje({ custodios: ['Jesús Pérez', 'Mayra García'] })]);
    expect(lineas(csv)[1]).toBe('Jesús Pérez | Mayra García,ABC-123,2026-09-01,5,1,6,Cerrado');
  });

  it('lista vacía devuelve sólo los encabezados', () => {
    expect(viajesACsv([])).toBe(
      'Unidad,Numero economico,Fecha,Cantidad de fotos,Cantidad de audios,Total de validaciones,Estado',
    );
  });
});

describe('nombreArchivoCsv', () => {
  const rango = { desde: '2026-09-01', hasta: '2026-09-30' };

  it('sin filtro de unidad usa sólo el rango', () => {
    expect(nombreArchivoCsv(rango, FILTRO_VACIO)).toBe('reporte_2026-09-01_2026-09-30.csv');
  });

  it('con unidad añade la placa en minúsculas', () => {
    expect(nombreArchivoCsv(rango, { ...FILTRO_VACIO, unidad: 'ABC-123' })).toBe(
      'reporte_2026-09-01_2026-09-30_abc-123.csv',
    );
  });

  it('sanea una placa con caracteres especiales', () => {
    expect(nombreArchivoCsv(rango, { ...FILTRO_VACIO, unidad: 'Ñú 12/3*?' })).toBe(
      'reporte_2026-09-01_2026-09-30_nu_12_3.csv',
    );
  });

  it('ignora una placa que queda vacía tras sanear', () => {
    expect(nombreArchivoCsv(rango, { ...FILTRO_VACIO, unidad: '***' })).toBe(
      'reporte_2026-09-01_2026-09-30.csv',
    );
  });

  it('con custodio añade su nombre saneado', () => {
    expect(nombreArchivoCsv(rango, { ...FILTRO_VACIO, custodio: 'c1' }, 'Jesús Pérez')).toBe(
      'reporte_2026-09-01_2026-09-30_jesus_perez.csv',
    );
  });

  it('con unidad y custodio pone primero la placa', () => {
    expect(
      nombreArchivoCsv(
        rango,
        { ...FILTRO_VACIO, unidad: 'ABC-123', custodio: 'c1' },
        'Jesús Pérez',
      ),
    ).toBe('reporte_2026-09-01_2026-09-30_abc-123_jesus_perez.csv');
  });

  it('omite el custodio si su nombre no se pudo resolver', () => {
    expect(nombreArchivoCsv(rango, { ...FILTRO_VACIO, custodio: 'c1' }, null)).toBe(
      'reporte_2026-09-01_2026-09-30.csv',
    );
  });

  it('el texto libre no afecta el nombre', () => {
    expect(nombreArchivoCsv(rango, { ...FILTRO_VACIO, texto: 'abc' })).toBe(
      'reporte_2026-09-01_2026-09-30.csv',
    );
  });
});

describe('descargarArchivo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('crea la URL del objeto, hace clic en el enlace y la libera', () => {
    const crear = vi.fn(() => 'blob:prueba');
    const revocar = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: crear, revokeObjectURL: revocar });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    descargarArchivo('x.csv', 'a,b', 'text/csv');

    expect(crear).toHaveBeenCalledTimes(1);
    expect(clic).toHaveBeenCalledTimes(1);
    expect(revocar).toHaveBeenCalledWith('blob:prueba');
    expect(document.querySelector('a[download]')).toBeNull();
    vi.unstubAllGlobals();
  });
});
