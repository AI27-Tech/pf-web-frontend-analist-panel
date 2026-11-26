import { describe, expect, it } from 'vitest';

import type { Envio, Medio, ReporteVinculado } from './tipos';
import { construirVistaEnvio, evaluarCorreccion, totalesDeEnvio } from './envios';

const envio: Envio = {
  shipmentId: 'S-100',
  clienteId: 'Colgate',
  numeroEconomico: '042',
  lineaTransportista: 'Transportes del Norte',
  bitacoraLegacyId: 'BIT-100',
  createdAtServer: new Date('2026-11-20T09:00:00-06:00'),
  vigente: false,
};

function medio(reporteId: string, tipo: 'FOTO' | 'AUDIO', hora: string): Medio {
  return {
    id: `${reporteId}-${tipo}-${hora}`,
    viajeId: reporteId,
    tipo,
    etiquetas: [],
    rutaOriginal: '',
    rutaMiniatura: null,
    capturadoEn: new Date(hora),
    recibidoEn: null,
    ubicacion: null,
    ubicacionTexto: null,
    comentario: null,
    bytes: 1,
    duracionMs: tipo === 'AUDIO' ? 1000 : null,
    placas: '042',
    custodioUid: 'c-1',
    fechaLocal: hora.slice(0, 10),
  };
}

const reportes: ReporteVinculado[] = [
  {
    id: 'r-1',
    ciclo: 'CERRADO',
    fechaLocal: '2026-11-20',
    placas: '042',
    custodioCorreo: 'a@ai27.com',
    abiertoEn: new Date('2026-11-20T08:00:00-06:00'),
  },
  {
    id: 'r-2',
    ciclo: 'ACTIVO',
    fechaLocal: '2026-11-21',
    placas: '042',
    custodioCorreo: 'b@ai27.com',
    abiertoEn: new Date('2026-11-21T07:30:00-06:00'),
  },
  {
    id: 'r-3',
    ciclo: 'DESCARTADO',
    fechaLocal: '2026-11-21',
    placas: '042',
    custodioCorreo: 'c@ai27.com',
    abiertoEn: new Date('2026-11-21T09:00:00-06:00'),
  },
];

describe('construirVistaEnvio', () => {
  it('agrupa los medios por seguimiento y ordena seguimientos del más reciente al más antiguo', () => {
    const medios = [
      medio('r-2', 'FOTO', '2026-11-21T07:40:00-06:00'),
      medio('r-1', 'FOTO', '2026-11-20T08:10:00-06:00'),
      medio('r-1', 'FOTO', '2026-11-20T08:05:00-06:00'),
    ];

    const vista = construirVistaEnvio(envio, reportes, medios, false);

    expect(vista.seguimientos.map((s) => s.id)).toEqual(['r-3', 'r-2', 'r-1']);
    expect(vista.seguimientos[2]!.medios.map((m) => m.id)).toEqual([
      'r-1-FOTO-2026-11-20T08:05:00-06:00',
      'r-1-FOTO-2026-11-20T08:10:00-06:00',
    ]);
    expect(vista.seguimientos[0]!.medios).toEqual([]);
  });

  it('propaga el recorte de lectura', () => {
    const vista = construirVistaEnvio(envio, reportes, [], true);
    expect(vista.recortado).toBe(true);
  });
});

describe('totalesDeEnvio', () => {
  it('un descartado no se lista y su evidencia no suma validaciones', () => {
    const vista = construirVistaEnvio(
      envio,
      reportes,
      [
        medio('r-1', 'FOTO', '2026-11-20T08:05:00-06:00'),
        medio('r-1', 'FOTO', '2026-11-20T08:06:00-06:00'),
        medio('r-1', 'AUDIO', '2026-11-20T08:07:00-06:00'),
        medio('r-2', 'FOTO', '2026-11-21T07:40:00-06:00'),
        medio('r-3', 'FOTO', '2026-11-21T09:05:00-06:00'),
        medio('r-3', 'FOTO', '2026-11-21T09:06:00-06:00'),
      ],
      false,
    );

    expect(totalesDeEnvio(vista.seguimientos)).toEqual({ seguimientos: 2, validaciones: 4 });
  });

  it('un envío sin actividad muestra cero seguimientos y cero validaciones', () => {
    expect(totalesDeEnvio([])).toEqual({ seguimientos: 0, validaciones: 0 });
  });
});

describe('evaluarCorreccion', () => {
  it('dejar en SIN_ENVIO algo que ya está SIN_ENVIO no escribe', () => {
    expect(
      evaluarCorreccion({
        vinculacionActual: 'SIN_ENVIO',
        shipmentIdActual: null,
        destino: null,
        envioDestino: null,
        clienteReporte: 'Colgate',
      }),
    ).toEqual({ ok: true, cambio: false });
  });

  it('mover un VINCULADO a SIN_ENVIO escribe', () => {
    expect(
      evaluarCorreccion({
        vinculacionActual: 'VINCULADO',
        shipmentIdActual: 'S-100',
        destino: null,
        envioDestino: null,
        clienteReporte: 'Colgate',
      }),
    ).toEqual({ ok: true, cambio: true });
  });

  it('un destino inexistente se rechaza', () => {
    expect(
      evaluarCorreccion({
        vinculacionActual: 'SIN_ENVIO',
        shipmentIdActual: null,
        destino: 'S-999',
        envioDestino: null,
        clienteReporte: 'Colgate',
      }),
    ).toEqual({ ok: false, mensaje: 'No encontramos el envío.' });
  });

  it('un destino de otra empresa se rechaza', () => {
    expect(
      evaluarCorreccion({
        vinculacionActual: 'SIN_ENVIO',
        shipmentIdActual: null,
        destino: 'S-200',
        envioDestino: { clienteId: 'OtraEmpresa' },
        clienteReporte: 'Colgate',
      }),
    ).toEqual({ ok: false, mensaje: 'El envío es de otra empresa.' });
  });

  it('corregir al mismo valor no escribe', () => {
    expect(
      evaluarCorreccion({
        vinculacionActual: 'VINCULADO',
        shipmentIdActual: 'S-100',
        destino: 'S-100',
        envioDestino: { clienteId: 'Colgate' },
        clienteReporte: 'Colgate',
      }),
    ).toEqual({ ok: true, cambio: false });
  });

  it('mover a otro envío de la misma empresa escribe', () => {
    expect(
      evaluarCorreccion({
        vinculacionActual: 'VINCULADO',
        shipmentIdActual: 'S-100',
        destino: 'S-103',
        envioDestino: { clienteId: 'Colgate' },
        clienteReporte: 'Colgate',
      }),
    ).toEqual({ ok: true, cambio: true });
  });
});
