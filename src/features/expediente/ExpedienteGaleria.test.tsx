import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Medio } from '@/lib/datos/tipos';

import { ExpedienteGaleria } from './ExpedienteGaleria';

/**
 * Medios de muestra (id `muestra-…`, como en `features/galeria/provisional.ts`)
 */
function crearMedio(sobrescribir: Partial<Medio>): Medio {
  return {
    id: 'muestra-0',
    viajeId: 'viaje-01',
    tipo: 'FOTO',
    etiquetas: ['salida'],
    rutaOriginal: 'muestras/archivo.jpg',
    rutaMiniatura: null,
    capturadoEn: new Date('2026-09-01T08:19:00-06:00'),
    recibidoEn: null,
    ubicacion: null,
    ubicacionTexto: null,
    comentario: null,
    bytes: 4_800_000,
    duracionMs: null,
    placas: 'YZ-498-LK',
    custodioUid: 'custodio-01',
    fechaLocal: '2026-09-01',
    ...sobrescribir,
  };
}

describe('ExpedienteGaleria', () => {
  it('muestra el mensaje de vacío cuando no hay medios y no está cargando', () => {
    render(<ExpedienteGaleria medios={[]} cargando={false} />);

    expect(
      screen.getByText('Este viaje no tiene archivos registrados todavía.'),
    ).toBeInTheDocument();
  });

  it('no muestra el mensaje de vacío mientras está cargando', () => {
    render(<ExpedienteGaleria medios={[]} cargando={true} />);

    expect(
      screen.queryByText('Este viaje no tiene archivos registrados todavía.'),
    ).not.toBeInTheDocument();
  });

  it('presenta todos los medios en una sola sección «Evidencias», sin agrupar por etiqueta', () => {
    const medios = [
      crearMedio({ id: 'muestra-1', etiquetas: ['salida'] }),
      crearMedio({ id: 'muestra-2', etiquetas: ['salida'] }),
      crearMedio({ id: 'muestra-3', etiquetas: ['incidencia'] }),
    ];

    render(<ExpedienteGaleria medios={medios} />);

    // Una sola sección plana, sin encabezados numerados por etiqueta.
    expect(screen.getByText('Evidencias')).toBeInTheDocument();
    expect(screen.queryByText(/\[01\]/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[02\]/)).not.toBeInTheDocument();
  });

  it('muestra el conteo real de evidencias del viaje en la sección única', () => {
    const medios = [
      crearMedio({ id: 'muestra-1', etiquetas: ['salida'] }),
      crearMedio({ id: 'muestra-2', etiquetas: ['incidencia'] }),
    ];

    render(<ExpedienteGaleria medios={medios} />);

    expect(screen.getByText('2 evidencias')).toBeInTheDocument();
  });

  it('muestra los medios sin etiqueta en la misma sección única, sin «Sin etiqueta»', () => {
    render(<ExpedienteGaleria medios={[crearMedio({ id: 'muestra-1', etiquetas: [] })]} />);

    expect(screen.getByText('Evidencias')).toBeInTheDocument();
    expect(screen.queryByText(/Sin etiqueta/i)).not.toBeInTheDocument();
    expect(screen.getByText('1 evidencia')).toBeInTheDocument();
  });

  it('renderiza una tarjeta por cada medio con su hora y placas', () => {
    const medios = [crearMedio({ id: 'muestra-1', etiquetas: ['salida'] })];
    const { container } = render(<ExpedienteGaleria medios={medios} />);

    expect(within(container).getByText(/02:19|08:19/)).toBeInTheDocument();
  });
});
