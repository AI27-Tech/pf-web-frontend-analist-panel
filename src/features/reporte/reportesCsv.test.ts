import { describe, expect, it } from 'vitest';

import type { EstadisticaCustodio, FilaViaje, Medio } from '@/lib/datos/tipos';

import {
  actividadPorDiaACsv,
  actividadPorUnidadACsv,
  nombreArchivoReporte,
  rankingNumerosEconomicosACsv,
  rankingUnidadesACsv,
  reporteUnidadACsv,
} from './reportesCsv';

function lineas(csv: string): string[] {
  return csv.split('\r\n');
}

function medio(parcial: Partial<Medio> = {}): Medio {
  return {
    id: 'm1',
    viajeId: 'v1',
    tipo: 'FOTO',
    etiquetas: [],
    rutaOriginal: '',
    rutaMiniatura: null,
    capturadoEn: new Date('2026-09-01T10:00:00Z'),
    recibidoEn: null,
    ubicacion: { latitud: 19.4295154, longitud: -99.2059598, precisionMetros: 10, antiguedadMs: 0 },
    ubicacionTexto: null,
    comentario: null,
    bytes: 0,
    duracionMs: null,
    placas: 'ABC-123',
    custodioUid: 'u1',
    fechaLocal: '2026-09-01',
    ...parcial,
  };
}

function viaje(parcial: Partial<FilaViaje>): FilaViaje {
  return {
    id: 'v',
    placas: 'ABC-123',
    custodios: [],
    fechaLocal: '2026-09-01',
    fotos: 0,
    audios: 0,
    ciclo: 'CERRADO',
    hayNovedad: false,
    ...parcial,
  };
}

const rango = { desde: '2026-09-01', hasta: '2026-09-04' };

const viajes: FilaViaje[] = [
  viaje({ id: 'v1', custodios: ['Ana'], fechaLocal: '2026-09-01', fotos: 5, audios: 1 }),
  viaje({
    id: 'v2',
    placas: 'XYZ-789',
    custodios: ['Beto'],
    fechaLocal: '2026-09-02',
    fotos: 4,
    hayNovedad: true,
  }),
  viaje({
    id: 'v3',
    custodios: ['Ana', 'Beto'],
    fechaLocal: '2026-09-03',
    fotos: 5,
    audios: 1,
  }),
  viaje({ id: 'v4', placas: '', custodios: ['Ana'], fechaLocal: '2026-09-03', fotos: 1 }),
  viaje({ id: 'v5', placas: 'XYZ-789', custodios: ['Beto'], fechaLocal: '2026-09-02' }),
  // Fuera del rango de los reportes de actividad (termina el 09-04).
  viaje({ id: 'v6', placas: 'QQQ-1', custodios: ['Ana'], fechaLocal: '2026-09-05' }),
];

describe('nombreArchivoReporte', () => {
  it('arma prefijo, sujeto saneado y rango', () => {
    expect(nombreArchivoReporte('reporte_unidad', rango, 'Jesús Pérez')).toBe(
      'reporte_unidad_jesus_perez_2026-09-01_2026-09-04.csv',
    );
  });

  it('sin sujeto, o con sujeto que queda vacío, lo omite', () => {
    expect(nombreArchivoReporte('ranking_unidades', rango)).toBe(
      'ranking_unidades_2026-09-01_2026-09-04.csv',
    );
    expect(nombreArchivoReporte('ranking_unidades', rango, '***')).toBe(
      'ranking_unidades_2026-09-01_2026-09-04.csv',
    );
  });
});

describe('reporteUnidadACsv', () => {
  it('escribe sólo la tabla: encabezados en orden y una fila por archivo', () => {
    const csv = reporteUnidadACsv([
      medio({ id: 'm1', fechaLocal: '2026-09-02' }),
      medio({ id: 'm2', tipo: 'AUDIO', ubicacion: null }),
    ]);
    expect(lineas(csv)).toEqual([
      'Numero economico,Tipo de archivo,Fecha,Hora,Latitud,Longitud',
      // 10:00 UTC = 04:00 en America/Mexico_City (UTC-6).
      'ABC-123,Audio,2026-09-01,04:00:00,,',
      'ABC-123,Foto,2026-09-02,04:00:00,19.4295154,-99.2059598',
    ]);
  });

  it('no lleva título, línea en blanco ni ID del archivo', () => {
    const csv = reporteUnidadACsv([medio({ id: 'id-secreto' })]);
    expect(csv).not.toContain('Unidad:');
    expect(csv).not.toContain('id-secreto');
    expect(csv).not.toContain('ID del archivo');
    expect(lineas(csv).every((l) => l !== '')).toBe(true);
  });

  it('ordena por fecha y luego por hora de captura', () => {
    const csv = reporteUnidadACsv([
      medio({ id: 'tarde', capturadoEn: new Date('2026-09-01T18:00:00Z') }),
      medio({ id: 'temprano', capturadoEn: new Date('2026-09-01T08:00:00Z') }),
    ]);
    expect(
      lineas(csv)
        .slice(1)
        .map((l) => l.split(',')[3]),
    ).toEqual(['02:00:00', '12:00:00']);
  });

  it('la hora va en zona de México, en 24 horas y con segundos, incluida la medianoche', () => {
    const csv = reporteUnidadACsv([
      // 06:00:45 UTC = 00:00:45 en México: debe salir 00:00:45, no 24:00:45.
      medio({ capturadoEn: new Date('2026-09-01T06:00:45Z') }),
    ]);
    expect(lineas(csv)[1]).toContain(',00:00:45,');
  });

  it('conserva los segundos exactos de la captura', () => {
    const csv = reporteUnidadACsv([medio({ capturadoEn: new Date('2026-11-01T20:41:37Z') })]);
    expect(lineas(csv)[1]).toContain(',14:41:37,');
  });

  it('un medio sin hora de captura deja la hora vacía en lugar de inventarla', () => {
    const csv = reporteUnidadACsv([medio({ capturadoEn: new Date(0) })]);
    expect(lineas(csv)[1]).toBe('ABC-123,Foto,2026-09-01,,19.4295154,-99.2059598');
  });

  it('no antepone apóstrofo a una longitud negativa (es número)', () => {
    const csv = reporteUnidadACsv([medio()]);
    expect(csv).toContain(',-99.2059598');
    expect(csv).not.toContain("'-99");
  });

  it('neutraliza un número económico que parezca fórmula', () => {
    const csv = reporteUnidadACsv([medio({ placas: '=1+1' })]);
    expect(lineas(csv)[1]).toContain(`"'=1+1"`);
  });

  it('sin archivos deja sólo los encabezados', () => {
    expect(lineas(reporteUnidadACsv([]))).toEqual([
      'Numero economico,Tipo de archivo,Fecha,Hora,Latitud,Longitud',
    ]);
  });
});

describe('rankingUnidadesACsv', () => {
  const custodios: EstadisticaCustodio[] = [
    { uid: 'a', nombre: 'Ana', viajes: 3, fotos: 10, audios: 2 },
    { uid: 'b', nombre: 'Beto', viajes: 1, fotos: 10, audios: 5 },
    { uid: 'c', nombre: 'Carla', viajes: 0, fotos: 4, audios: 0 },
    { uid: 'd', nombre: 'Dani', viajes: 3, fotos: 2, audios: 2 },
  ];

  it('ordena por fotos (desempate por total) y calcula posiciones y promedio', () => {
    expect(lineas(rankingUnidadesACsv(custodios))).toEqual([
      'Unidad,Seguimientos,Fotos,Audios,Total de evidencias,Promedio de fotos por seguimiento,Posicion por seguimientos,Posicion por fotos,Posicion por audios,Posicion por total',
      'Beto,1,10,5,15,10,3,1,1,1',
      'Ana,3,10,2,12,3.33,1,1,2,2',
      // Sin viajes: el promedio queda vacío.
      'Carla,0,4,0,4,,4,3,4,3',
      'Dani,3,2,2,4,0.67,1,4,2,3',
    ]);
  });

  it('los empates comparten posición y la siguiente se salta', () => {
    // Ana y Dani empatan en viajes (1°); Beto queda en 3°, no en 2°.
    const filas = lineas(rankingUnidadesACsv(custodios)).slice(1);
    const posViajes = Object.fromEntries(filas.map((l) => [l.split(',')[0], l.split(',')[6]]));
    expect(posViajes).toEqual({ Ana: '1', Dani: '1', Beto: '3', Carla: '4' });
  });

  it('lista vacía devuelve sólo los encabezados', () => {
    expect(lineas(rankingUnidadesACsv([]))).toHaveLength(1);
  });
});

describe('rankingNumerosEconomicosACsv', () => {
  it('agrupa por placas, omite viajes sin placas y ordena por viajes', () => {
    expect(lineas(rankingNumerosEconomicosACsv(viajes))).toEqual([
      'Numero economico,Seguimientos,Fotos,Audios,Total de evidencias,Unidades distintas',
      // ABC-123 y XYZ-789 empatan en 2 viajes; ABC-123 gana por total (12 contra 4).
      'ABC-123,2,10,2,12,2',
      'XYZ-789,2,4,0,4,1',
      'QQQ-1,1,0,0,0,1',
    ]);
  });

  it('lista vacía devuelve sólo los encabezados', () => {
    expect(lineas(rankingNumerosEconomicosACsv([]))).toHaveLength(1);
  });
});

describe('actividadPorDiaACsv', () => {
  it('incluye todos los días del rango, con ceros, e ignora viajes fuera del rango', () => {
    expect(lineas(actividadPorDiaACsv(viajes, rango))).toEqual([
      'Fecha,Seguimientos,Fotos,Audios,Total de evidencias,Numeros economicos activos',
      '2026-09-01,1,5,1,6,1',
      '2026-09-02,2,4,0,4,1',
      // v3 (ABC-123) y v4 (sin placas): un solo número económico.
      '2026-09-03,2,6,1,7,1',
      '2026-09-04,0,0,0,0,0',
    ]);
  });

  it('un rango invertido devuelve sólo los encabezados', () => {
    expect(
      lineas(actividadPorDiaACsv(viajes, { desde: '2026-09-04', hasta: '2026-09-01' })),
    ).toHaveLength(1);
  });
});

describe('actividadPorUnidadACsv', () => {
  const custodios: EstadisticaCustodio[] = [
    { uid: 'a', nombre: 'Ana', viajes: 3, fotos: 10, audios: 2 },
    { uid: 'b', nombre: 'Beto', viajes: 2, fotos: 4, audios: 0 },
    { uid: 'c', nombre: 'Carla', viajes: 0, fotos: 1, audios: 0 },
  ];

  it('cuenta días activos dentro del rango y deja vacío lo que no aplica', () => {
    expect(lineas(actividadPorUnidadACsv(custodios, viajes, rango))).toEqual([
      'Unidad,Dias activos,Dias sin actividad,Primera fecha,Ultima fecha,Seguimientos,Total de evidencias,Promedio evidencias por seguimiento',
      // Ana: días 09-01 y 09-03 (el viaje del 09-05 queda fuera del rango); 12 / 3 viajes = 4.
      'Ana,2,2,2026-09-01,2026-09-03,3,12,4',
      'Beto,2,2,2026-09-02,2026-09-03,2,4,2',
      // Sin días activos ni viajes: sin fechas ni promedio, y todo el rango como «sin actividad».
      'Carla,0,4,,,0,1,',
    ]);
  });

  it('lista vacía devuelve sólo los encabezados', () => {
    expect(lineas(actividadPorUnidadACsv([], viajes, rango))).toHaveLength(1);
  });
});
