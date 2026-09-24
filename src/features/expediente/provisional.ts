/*
 * Datos PROVISIONALES del expediente.
 *
 * El expediente agrupa sus medios por `etiqueta` (docs/PLAN.md §7).
 * Todo esto se borra cuando el expediente consuma medios reales de Firestore.
 */

import type { Medio } from '@/lib/datos/tipos';

/** Una sección de la maqueta: su etiqueta y los archivos que la componen. */
interface GrupoMuestra {
  etiqueta: string;
  archivos: readonly string[];
}

const GRUPOS: readonly GrupoMuestra[] = [
  {
    etiqueta: 'Inspección de origen y embarque',
    archivos: [
      'IMG_0814_FRONTAL.RAW',
      'PLACA_ENGOMADO.RAW',
      'MARCHAMO_PERNO.RAW',
      'PUERTAS_TRAS.RAW',
      'CABINA_OPERADOR.RAW',
      'GUIA_EMBARQUE_F9.TIF',
    ],
  },
  {
    etiqueta: 'Incidencias y telemetría en ruta',
    archivos: [
      'DESVIO_KM44_SAT.PNG',
      'PARADA_NO_AUT.RAW',
      'SENSOR_APERTURA.IR',
      'REANUD_RUTA_GPS.PNG',
      'CAM_FRONTAL_KM68.JPG',
      'PUNTO_CONTROL_C84.JPG',
    ],
  },
  {
    etiqueta: 'Llegada y cotejo forense',
    archivos: [
      'ARRIBO_CEDIS_QRO.RAW',
      'INSP_PERIMETRAL.RAW',
      'SELLO_FINAL_S9921.RAW',
      'APERTURA_SUPERV.RAW',
      'COTEJO_MERCANCIA.RAW',
      'RECEPCION_SHA256.SIG',
    ],
  },
];

const PLACAS: readonly string[] = ['YZ-490-LK', 'AB-102-XP', 'TX-884-MN', 'KL-553-QA'];

function buildMedio(etiqueta: string, fileName: string, indice: number): Medio {
  const placa = PLACAS[indice % PLACAS.length] ?? 'YZ-490-LK';
  const base = new Date();
  base.setHours(8, 14 + indice * 7, 0, 0);
  const esAudio = fileName.endsWith('.IR') && indice % 9 === 2;
  return {
    id: `muestra-exp-${indice}`,
    viajeId: 'viaje-muestra',
    tipo: esAudio ? 'AUDIO' : 'FOTO',
    etiquetas: [etiqueta],
    rutaOriginal: `muestras/${fileName}`,
    rutaMiniatura: null,
    capturadoEn: base,
    recibidoEn: base,
    ubicacion: null,
    ubicacionTexto: null,
    comentario: null,
    bytes: Math.round((2.1 + ((indice * 137) % 48) / 10) * 1024 * 1024),
    duracionMs: esAudio ? 42000 : null,
    placas: placa,
    custodioUid: `custodio-${indice % 6}`,
    fechaLocal: '2024-10-24',
  };
}

/** Evidencias de muestra del expediente, agrupadas en tres secciones como la maqueta. */
export const MEDIOS_MUESTRA_EXPEDIENTE: readonly Medio[] = GRUPOS.flatMap((grupo, g) =>
  grupo.archivos.map((archivo, a) => buildMedio(grupo.etiqueta, archivo, g * 6 + a)),
);
