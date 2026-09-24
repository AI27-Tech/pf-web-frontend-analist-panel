import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

import type { Viaje } from '@/lib/datos/tipos';

import { ExpedienteHeader } from './ExpedienteHeader';

function crearViaje(sobrescribir: Partial<Viaje> = {}): Viaje {
  return {
    id: 'viaje-01',
    placas: 'YZ-498-LK',
    custodioTelefono: '+525563320001',
    custodioName: 'Cap. Jesús Pérez R.',
    custodioUid: 'custodio-01',
    fechaLocal: '2026-09-01',
    abiertoEn: new Date('2026-09-01T08:30:00-06:00'),
    cerradoEn: null,
    comentario: null,
    isUpdated: false,
    ciclo: 'ACTIVO',
    motivoDescarte: null,
    subida: 'EN_PROGRESO',
    completo: false,
    mediosEsperados: 18,
    uploadedFiles: 14,
    estados: ['activo'],
    etiquetas: [],
    fotos: 12,
    audios: 2,
    ...sobrescribir,
  };
}

/** `ExpedienteHeader` usa `<Link>`, que necesita un router montado alrededor. */
function renderConRouter(viaje: Viaje) {
  const rootRoute = createRootRoute({
    component: () => <ExpedienteHeader viaje={viaje} />,
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('ExpedienteHeader', () => {
  it('muestra las placas y el identificador del viaje en el breadcrumb', async () => {
    renderConRouter(crearViaje());

    expect(await screen.findByText('YZ-498-LK')).toBeInTheDocument();
    expect(screen.getByText(/Expediente viaje-01/)).toBeInTheDocument();
  });

  it('muestra un badge por cada estado operativo del viaje', async () => {
    renderConRouter(crearViaje({ estados: ['alerta_desvio', 'en_ruta'] }));

    expect(await screen.findByText('Alerta de desvío')).toBeInTheDocument();
    expect(screen.getByText('En ruta')).toBeInTheDocument();
  });

  it('muestra sólo la acción de exportar a PDF, sin las otras dos', async () => {
    renderConRouter(crearViaje());

    expect(
      await screen.findByRole('button', { name: /Exportar reporte PDF/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Compartir enlace forense/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar todo/i })).not.toBeInTheDocument();
  });

  it('dispara la impresión del navegador al exportar a PDF', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderConRouter(crearViaje());

    const boton = await screen.findByRole('button', { name: /Exportar reporte PDF/i });
    await userEvent.click(boton);

    expect(imprimir).toHaveBeenCalledTimes(1);
    imprimir.mockRestore();
  });
});
