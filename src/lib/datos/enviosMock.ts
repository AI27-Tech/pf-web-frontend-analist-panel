/**
 * ESTE ARCHIVO ES DE DESARROLLO. Se usa con `VITE_DATOS_MOCK=true` mientras las reglas de
 * `envios` no existan en el emulador. Sembrado con el ejemplo común del handoff:
 * `S-100 / 042`, `S-101 / 037`, `S-103 / 042`, más una empresa ajena para probar el
 * aislamiento del Cliente.
 */

import type { Envio, Medio, ResultadoCorreccion, VistaEnvio } from './tipos';
import { construirVistaEnvio, evaluarCorreccion } from './envios';

export const enviosEstaticos: Envio[] = [
  {
    shipmentId: 'S-100',
    clienteId: 'Colgate',
    numeroEconomico: '042',
    lineaTransportista: 'Transportes del Norte',
    bitacoraLegacyId: 'BIT-100',
    createdAtServer: new Date('2026-11-20T09:00:00-06:00'),
    vigente: false,
  },
  {
    shipmentId: 'S-101',
    clienteId: 'Colgate',
    numeroEconomico: '037',
    lineaTransportista: 'Logística Central',
    bitacoraLegacyId: 'BIT-101',
    createdAtServer: new Date('2026-11-21T09:00:00-06:00'),
    vigente: true,
  },
  {
    shipmentId: 'S-103',
    clienteId: 'Colgate',
    numeroEconomico: '042',
    lineaTransportista: 'Transportes del Norte',
    bitacoraLegacyId: 'BIT-103',
    createdAtServer: new Date('2026-11-22T09:00:00-06:00'),
    vigente: true,
  },
  {
    shipmentId: 'S-200',
    clienteId: 'OtraEmpresa',
    numeroEconomico: '099',
    lineaTransportista: 'Carga Ajena',
    bitacoraLegacyId: 'BIT-200',
    createdAtServer: new Date('2026-11-20T09:00:00-06:00'),
    vigente: true,
  },
];

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
    bytes: 1024,
    duracionMs: tipo === 'AUDIO' ? 30_000 : null,
    placas: '042',
    custodioUid: 'custodio-mock',
    fechaLocal: hora.slice(0, 10),
  };
}

/** Seguimientos sembrados: dos en `S-100` (uno con tres medios), uno descartado con
 *  medios que NO debe contar, y los demás envíos con un seguimiento cada uno. */
const reportesEstaticos = [
  {
    id: 'r-100-a',
    shipmentId: 'S-100',
    clienteId: 'Colgate',
    ciclo: 'CERRADO',
    placas: '042',
    custodioCorreo: 'b0001@ai27.com',
    abiertoEn: new Date('2026-11-20T08:00:00-06:00'),
    medios: [
      medio('r-100-a', 'FOTO', '2026-11-20T08:05:00-06:00'),
      medio('r-100-a', 'FOTO', '2026-11-20T08:10:00-06:00'),
      medio('r-100-a', 'AUDIO', '2026-11-20T08:12:00-06:00'),
    ],
  },
  {
    id: 'r-100-b',
    shipmentId: 'S-100',
    clienteId: 'Colgate',
    ciclo: 'ACTIVO',
    placas: '042',
    custodioCorreo: 'b0002@ai27.com',
    abiertoEn: new Date('2026-11-21T07:30:00-06:00'),
    medios: [medio('r-100-b', 'FOTO', '2026-11-21T07:35:00-06:00')],
  },
  {
    id: 'r-100-c',
    shipmentId: 'S-100',
    clienteId: 'Colgate',
    ciclo: 'DESCARTADO',
    placas: '042',
    custodioCorreo: 'b0003@ai27.com',
    abiertoEn: new Date('2026-11-21T09:00:00-06:00'),
    medios: [
      medio('r-100-c', 'FOTO', '2026-11-21T09:05:00-06:00'),
      medio('r-100-c', 'FOTO', '2026-11-21T09:06:00-06:00'),
    ],
  },
  {
    id: 'r-101',
    shipmentId: 'S-101',
    clienteId: 'Colgate',
    ciclo: 'CERRADO',
    placas: '037',
    custodioCorreo: 'b0004@ai27.com',
    abiertoEn: new Date('2026-11-21T10:00:00-06:00'),
    medios: [medio('r-101', 'FOTO', '2026-11-21T10:10:00-06:00')],
  },
  {
    id: 'r-103',
    shipmentId: 'S-103',
    clienteId: 'Colgate',
    ciclo: 'CERRADO',
    placas: '042',
    custodioCorreo: 'b0005@ai27.com',
    abiertoEn: new Date('2026-11-22T06:00:00-06:00'),
    medios: [],
  },
  {
    id: 'r-200',
    shipmentId: 'S-200',
    clienteId: 'OtraEmpresa',
    ciclo: 'CERRADO',
    placas: '099',
    custodioCorreo: 'ajeno@otra.com',
    abiertoEn: new Date('2026-11-20T08:00:00-06:00'),
    medios: [medio('r-200', 'FOTO', '2026-11-20T08:05:00-06:00')],
  },
] as const;

export function obtenerEnvioMock(shipmentId: string): Promise<Envio | null> {
  const envio = enviosEstaticos.find((e) => e.shipmentId === shipmentId);
  return Promise.resolve(envio ?? null);
}

/** Envíos del rol: todos para el Analista (`null`), los de su empresa para el Cliente. */
export function listarEnviosMock(clienteId: string | null): Envio[] {
  return enviosEstaticos
    .filter((envio) => clienteId === null || envio.clienteId === clienteId)
    .sort((a, b) => (b.createdAtServer?.getTime() ?? 0) - (a.createdAtServer?.getTime() ?? 0));
}

export function obtenerVistaEnvioMock(shipmentId: string): Promise<VistaEnvio | null> {
  const envio = enviosEstaticos.find((e) => e.shipmentId === shipmentId);
  if (!envio) return Promise.resolve(null);
  const reportes = reportesEstaticos
    .filter((r) => r.shipmentId === shipmentId && r.clienteId === envio.clienteId)
    .map((r) => ({
      id: r.id,
      clienteId: r.clienteId,
      ciclo: r.ciclo,
      fechaLocal: r.abiertoEn.toISOString().slice(0, 10),
      placas: r.placas,
      custodioCorreo: r.custodioCorreo,
      abiertoEn: r.abiertoEn,
    }));
  const medios = reportesEstaticos
    .filter((r) => r.shipmentId === shipmentId && r.clienteId === envio.clienteId)
    .flatMap((r) => r.medios);
  return Promise.resolve(construirVistaEnvio(envio, reportes, medios, false));
}

/**
 * Corrige el vínculo en memoria: valida el destino con la misma función pura que la
 * fuente real y muta el estado sembrado para que la pantalla refleje el cambio.
 * shortcut: el cambio se pierde al recargar; es material de desarrollo.
 */
export function corregirVinculacionMock(opciones: {
  reporteId: string;
  shipmentId: string | null;
}): Promise<ResultadoCorreccion> {
  const reporte = reportesEstaticos.find((r) => r.id === opciones.reporteId);
  if (!reporte) return Promise.resolve({ ok: false, mensaje: 'El seguimiento no existe.' });
  const destino = (opciones.shipmentId ?? '').trim() || null;
  const envioDestino = destino
    ? (enviosEstaticos.find((e) => e.shipmentId === destino) ?? null)
    : null;
  const decision = evaluarCorreccion({
    vinculacionActual: reporte.shipmentId === null ? 'SIN_ENVIO' : 'VINCULADO',
    shipmentIdActual: reporte.shipmentId,
    destino,
    envioDestino,
    clienteReporte: reporte.clienteId,
  });
  if (decision.ok && decision.cambio) {
    // El mock muta su arreglo de desarrollo; el `as const` sólo afecta a los tipos.
    (reporte as { shipmentId: string | null }).shipmentId = destino;
  }
  return Promise.resolve(decision);
}
