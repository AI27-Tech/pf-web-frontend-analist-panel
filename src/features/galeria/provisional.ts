/*
 * Datos PROVISIONALES de la galería.
 *
 * La maqueta muestra un "estado" por evidencia (OK, SELLADO, RAW, ALERTA, NOVEDAD,
 * PATIO, folios tipo S-9921) y una imagen por celda. El contrato de `Medio` todavía NO
 * tiene un campo de estado, y las miniaturas reales viven en Storage. Mientras esos
 * datos existen, este módulo los simula de forma DETERMINISTA a partir del id del medio:
 * el mismo archivo siempre cae en el mismo estado y la misma imagen, así la pantalla se
 * ve estable entre recargas en lugar de parpadear valores al azar.
 *
 * Convención de nombres (naming-conventions.md): los sustantivos de dominio —`medio`,
 * `estado`, `placa`— van en español; los helpers y datos técnicos, en inglés.
 *
 * Todo lo de aquí se borra cuando el estado sea un campo real y las miniaturas se
 * resuelvan desde Storage. No lo consumas fuera de la galería.
 */

import type { Medio } from '@/lib/datos/tipos';

/** Hash entero estable de una cadena (djb2). Sirve para elegir de forma determinista
 *  sin depender de aleatoriedad, que cambiaría en cada render. */
function hash(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = (h * 33) ^ text.charCodeAt(i);
  return h >>> 0;
}

/** Etiqueta de `estado` provisional y su variante de color en el `Badge`. `estado` es
 *  sustantivo de dominio; `label`/`variant` son técnicos. */
export interface EstadoProvisional {
  label: string;
  variant: 'secure' | 'alert' | 'escort' | 'warning' | 'neutral';
}

const ESTADOS: readonly EstadoProvisional[] = [
  { label: 'OK', variant: 'secure' },
  { label: 'SELLADO', variant: 'secure' },
  { label: 'RAW', variant: 'neutral' },
  { label: 'ALERTA', variant: 'alert' },
  { label: 'NOVEDAD', variant: 'warning' },
  { label: 'PATIO', variant: 'escort' },
];

/** `estado` provisional de un medio, derivado de su id. Determinista. */
export function estadoProvisional(medio: Medio): EstadoProvisional {
  const index = hash(medio.id) % ESTADOS.length;
  // El índice siempre cae en rango, pero `noUncheckedIndexedAccess` obliga al respaldo.
  return ESTADOS[index] ?? { label: 'OK', variant: 'secure' };
}

/**
 * URL de imagen provisional para una celda, determinista por id.
 *
 * Es un SVG generado en el momento y embebido como `data:` URI: NO hace ninguna petición
 * de red, así que no lo puede bloquear un proxy o el admin de la máquina, y funciona sin
 * conexión. El color sale del id del medio, para que cada celda se vea distinta pero
 * estable entre recargas. Muestra la etiqueta del medio para que la rejilla se lea como
 * un mosaico de evidencias y no como bloques vacíos.
 *
 * Cuando las miniaturas reales estén disponibles, esto se reemplaza por
 * `urlMiniatura(medio)` y este helper se borra.
 */
export function imagenProvisional(medio: Medio, lado = 320): string {
  const h = hash(medio.id);
  // Dos tonos del mismo matiz para un degradado sutil. El matiz sale del hash; la
  // saturación y luminosidad se fijan para que combinen con el tema oscuro del panel.
  const hue = h % 360;
  const c1 = `hsl(${hue} 45% 28%)`;
  const c2 = `hsl(${(hue + 40) % 360} 40% 18%)`;
  // Etiqueta abreviada, en mayúsculas, escapada para XML (por si trae &, < o >).
  const texto = (medio.etiquetas[0] || 'EVIDENCIA')
    .slice(0, 12)
    .toUpperCase()
    .replace(/[<>&]/g, ' ');
  // La tipografía escala con el lienzo para que se lea igual en miniatura y en el visor.
  const fontSize = Math.round(lado / 16);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
</linearGradient></defs>
<rect width="${lado}" height="${lado}" fill="url(#g)"/>
<text x="50%" y="50%" fill="rgba(255,255,255,0.72)" font-family="monospace" font-size="${fontSize}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${texto}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** ¿Es un medio de muestra (no vive en Storage)? Los de muestra llevan id `muestra-…`.
 *  Sirve para que el visor no intente pedir a Storage un original que no existe. */
export function esMuestra(medio: Medio): boolean {
  return medio.id.startsWith('muestra-');
}

/**
 * Identificador corto y estable de un medio, como el sello hexadecimal de la maqueta
 * (`#4a8b9c1`). Se deriva del id con el mismo hash determinista, así que el mismo medio
 * siempre muestra el mismo sello entre recargas. Es una ayuda visual de la maqueta, no
 * un dato del contrato de `Medio`; cuando exista un folio real, se reemplaza por él.
 */
export function idCortoDe(medio: Medio): string {
  // Se mezcla el id con su longitud y se toman los 7 dígitos hex BAJOS: los altos apenas
  // cambian entre ids casi iguales (`muestra-exp-0` vs `-1`) y darían sellos repetidos.
  const h = (hash(medio.id) ^ (hash(medio.id.split('').reverse().join('')) * 2654435761)) >>> 0;
  return `#${h.toString(16).padStart(8, '0').slice(-7)}`;
}

/**
 * Resuelve la URL que el visor debe mostrar.
 *
 * Para una FOTO de muestra devuelve el SVG local en grande —Storage no tiene ese archivo,
 * así que pedirlo dejaría el visor cargando para siempre—. Para un AUDIO de muestra
 * devuelve cadena vacía: no hay audio real que reproducir, y el visor de audio muestra
 * ese caso como muestra sin pista en vez de un reproductor roto. Para un medio real
 * delega en `resolverReal` (en producción, `urlOriginal`). Cuando toda la galería consuma
 * datos reales, el visor usa `urlOriginal` directo y esto se borra.
 */
export function resolverImagenVisor(
  medio: Medio,
  resolverReal: (medio: Medio) => Promise<string> | string,
): Promise<string> | string {
  if (!esMuestra(medio)) return resolverReal(medio);
  return medio.tipo === 'AUDIO' ? '' : imagenProvisional(medio, 1024);
}

/*
 * Medios de MUESTRA para poblar la galería mientras Firebase no devuelve datos (config
 * de desarrollo ficticia, o el corpus todavía vacío). Reproducen el aspecto de la
 * maqueta: 32 evidencias con nombre, unidad, hora y peso variados. En cuanto el loader
 * traiga documentos reales, esto no se usa —`listarMedios` gana— y se puede borrar.
 */

const FILE_NAMES: readonly string[] = [
  'PERNO_S9921.RAW',
  'PLACA_FED.RAW',
  'CAM_FRONTAL.JPG',
  'SELLO_POST.RAW',
  'CABINA_OP.RAW',
  'DESVIO_KM44.PNG',
  'SENSOR_IR.RAW',
  'RECEPCION_CEDIS.RAW',
  'GUAYA_SEAL02.RAW',
  'MANIFIESTO_DOC.RAW',
  'CAM_LATERAL_IZQ.RAW',
  'GPS_CONSOLA.PNG',
  'PEAJE_TAG_CRU.RAW',
  'LLANTA_REV.RAW',
  'SELLO_CANDADO.RAW',
  'TANQUE_DIESEL.RAW',
  'ESTIBA_INT_A1.RAW',
  'PARADA_NO_PROG.RAW',
  'OCR_BOLT_992.RAW',
  'PATIO_CEDIS_NTE.RAW',
  'OPERADOR_MONITOR.RAW',
  'DEFENSA_POST.RAW',
  'ANTENA_SAT.RAW',
  'VERIF_CALIPER.RAW',
  'ACCESO_CASETA.RAW',
  'ENGANCHE_QUINTA.RAW',
  'CINTA_VOID_FRAC.RAW',
  'TRAMO_NOCT_KM11.RAW',
  'MOTOR_CABLEADO.RAW',
  'MANIOBRA_MONTAC.RAW',
  'ODOMETRO_FINAL.RAW',
  'SALIDA_FINAL_PAT.RAW',
];

/** `placa` es sustantivo de dominio: el catálogo de muestra se queda en español. */
const PLACAS: readonly string[] = ['YZ-490-LK', 'AB-102-XP', 'TX-884-MN', 'KL-553-QA'];

function buildSample(fileName: string, i: number): Medio {
  const placa = PLACAS[i % PLACAS.length] ?? 'YZ-490-LK';
  // Horas escalonadas desde las 08:19, para que la esquina de cada celda varíe.
  const base = new Date();
  base.setHours(8, 19 + i * 7, 0, 0);
  const isAudio = fileName.endsWith('.RAW') && i % 11 === 5;
  return {
    id: `muestra-${i}`,
    viajeId: `viaje-muestra-${i % 8}`,
    tipo: isAudio ? 'AUDIO' : 'FOTO',
    etiquetas: [fileName.split(/[_.]/)[0] ?? 'EVIDENCIA'],
    rutaOriginal: `muestras/${fileName}`,
    rutaMiniatura: null,
    capturadoEn: base,
    recibidoEn: base,
    ubicacion: null,
    ubicacionTexto: null,
    comentario: null,
    // Pesos entre ~2.5 y ~6.9 MB, como en la maqueta.
    bytes: Math.round((2.5 + ((i * 137) % 45) / 10) * 1024 * 1024),
    duracionMs: isAudio ? 42000 : null,
    placas: placa,
    custodioUid: `custodio-${i % 6}`,
    fechaLocal: '2024-10-01',
  };
}

/** Las 32 evidencias de muestra de la maqueta. */
export const SAMPLE_MEDIOS: readonly Medio[] = FILE_NAMES.map(buildSample);
