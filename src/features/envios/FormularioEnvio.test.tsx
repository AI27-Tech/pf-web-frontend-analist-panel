import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listarNumerosEconomicos,
  registrarEnvio,
  type EnvioRegistrado,
  type ResultadoRegistro,
} from '@/lib/datos/registroEnvios';
import { EnviosSection } from './EnviosSection';

vi.mock('@/lib/datos/registroEnvios', () => ({
  registrarEnvio: vi.fn(),
  listarNumerosEconomicos: vi.fn(),
}));

const SHIPMENT = '7001886000';
const BITACORA = 'AB8398334';

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <EnviosSection />
    </QueryClientProvider>,
  );
}

function confirmado(extra: Partial<EnvioRegistrado> = {}): ResultadoRegistro {
  return {
    ok: true,
    envio: {
      shipmentId: SHIPMENT,
      lineaTransportista: 'Transportes del Norte',
      numeroEconomico: '042',
      bitacoraLegacyId: BITACORA,
      registradoEn: new Date('2026-11-26T15:30:00'),
      ...extra,
    },
  };
}

const campoShipment = () => screen.getByLabelText('Shipment ID');
const campoLinea = () => screen.getByLabelText('Línea transportista');
const campoEconomico = () => screen.getByLabelText('Número económico');
const campoBitacora = () => screen.getByLabelText('ID de la bitácora');
const botonRegistrar = () => screen.getByRole('button', { name: /registrar checklist/i });

/** Captura los tres campos de texto y elige o escribe el económico. */
async function capturar(economico: string) {
  const usuario = userEvent.setup();
  await usuario.type(campoShipment(), SHIPMENT);
  await usuario.type(campoLinea(), 'Transportes del Norte');
  await usuario.type(campoEconomico(), economico);
  await usuario.type(campoBitacora(), BITACORA);
  return usuario;
}

describe('Sección Envíos (formulario del checklist)', () => {
  beforeEach(() => {
    vi.mocked(registrarEnvio).mockReset();
    vi.mocked(listarNumerosEconomicos).mockReset();
    vi.mocked(listarNumerosEconomicos).mockResolvedValue(['001', '042']);
  });

  it('pide los cuatro datos, no la empresa, y arranca sin registros recientes', async () => {
    renderizar();
    expect(campoShipment()).toBeInTheDocument();
    expect(campoLinea()).toBeInTheDocument();
    expect(campoEconomico()).toBeInTheDocument();
    expect(campoBitacora()).toBeInTheDocument();
    expect(screen.queryByLabelText(/empresa|cliente/i)).not.toBeInTheDocument();
    expect(screen.getByText('No hay registros recientes.')).toBeInTheDocument();
    expect(botonRegistrar()).toBeDisabled();
  });

  it('el Shipment ID acepta solo dígitos (10) y la bitácora se pone en mayúsculas (9)', async () => {
    renderizar();
    const usuario = userEvent.setup();
    await usuario.type(campoShipment(), '70a01-886000999');
    expect(campoShipment()).toHaveValue('7001886000');
    expect(screen.getByText('10/10 dígitos')).toBeInTheDocument();

    await usuario.type(campoBitacora(), 'ab-83983340000');
    expect(campoBitacora()).toHaveValue('AB8398334');
    expect(screen.getByText(/9\/9 caracteres/)).toBeInTheDocument();
  });

  it('envía el económico 042 como texto, con su cero, y no envía la empresa', async () => {
    vi.mocked(registrarEnvio).mockResolvedValue(confirmado());
    renderizar();
    const usuario = await capturar('042');
    await usuario.click(botonRegistrar());

    await waitFor(() => expect(registrarEnvio).toHaveBeenCalledTimes(1));
    const enviado = vi.mocked(registrarEnvio).mock.calls[0]?.[0];
    expect(enviado).toEqual({
      shipmentId: SHIPMENT,
      lineaTransportista: 'Transportes del Norte',
      numeroEconomico: '042',
      bitacoraLegacyId: BITACORA,
    });
    expect(typeof enviado?.numeroEconomico).toBe('string');
  });

  it('confirma solo cuando la función confirma: limpia el formulario y lista el registro', async () => {
    vi.mocked(registrarEnvio).mockResolvedValue(confirmado());
    renderizar();
    const usuario = await capturar('042');
    await usuario.click(botonRegistrar());

    expect(await screen.findByText('Envío registrado')).toBeInTheDocument();
    expect(campoShipment()).toHaveValue('');
    expect(campoBitacora()).toHaveValue('');
    const recientes = screen.getByRole('list', { name: /registrados en esta sesión/i });
    expect(within(recientes).getByText(SHIPMENT)).toBeInTheDocument();
    expect(within(recientes).getByText('042')).toBeInTheDocument();
    await waitFor(() => expect(campoShipment()).toHaveFocus());
  });

  it('un Shipment ID duplicado no se presenta como alta y conserva la captura', async () => {
    vi.mocked(registrarEnvio).mockResolvedValue({ ok: false, causa: 'duplicado' });
    renderizar();
    const usuario = await capturar('042');
    await usuario.click(botonRegistrar());

    expect(await screen.findByText('Ese Shipment ID ya está registrado')).toBeInTheDocument();
    expect(screen.queryByText('Envío registrado')).not.toBeInTheDocument();
    expect(screen.getByText('No hay registros recientes.')).toBeInTheDocument();
    expect(campoShipment()).toHaveValue(SHIPMENT);
    expect(campoLinea()).toHaveValue('Transportes del Norte');
    expect(campoEconomico()).toHaveValue('042');
    expect(campoBitacora()).toHaveValue(BITACORA);
  });

  it('un error de conexión se distingue del duplicado, no es un alta y conserva la captura', async () => {
    vi.mocked(registrarEnvio).mockResolvedValue({ ok: false, causa: 'sin-conexion' });
    renderizar();
    const usuario = await capturar('042');
    await usuario.click(botonRegistrar());

    expect(await screen.findByText('No se pudo confirmar el registro')).toBeInTheDocument();
    expect(screen.queryByText('Ese Shipment ID ya está registrado')).not.toBeInTheDocument();
    expect(screen.queryByText('Envío registrado')).not.toBeInTheDocument();
    expect(campoShipment()).toHaveValue(SHIPMENT);
    expect(campoEconomico()).toHaveValue('042');
    // El reintento queda disponible con la misma captura.
    expect(botonRegistrar()).toBeEnabled();
  });

  it('si el reintento sale duplicado tras un corte de conexión, advierte que pudo quedar registrado', async () => {
    vi.mocked(registrarEnvio)
      .mockResolvedValueOnce({ ok: false, causa: 'sin-conexion' })
      .mockResolvedValueOnce({ ok: false, causa: 'duplicado' });
    renderizar();
    const usuario = await capturar('042');
    await usuario.click(botonRegistrar());
    await screen.findByText('No se pudo confirmar el registro');
    await usuario.click(botonRegistrar());

    expect(await screen.findByText('Ese Shipment ID ya está registrado')).toBeInTheDocument();
    expect(screen.getByText(/pudo quedar|es posible que ese envío ya haya/i)).toBeInTheDocument();
  });

  it('el duplicado sin un corte previo no insinúa que el envío sea del usuario', async () => {
    vi.mocked(registrarEnvio).mockResolvedValue({ ok: false, causa: 'duplicado' });
    renderizar();
    const usuario = await capturar('042');
    await usuario.click(botonRegistrar());
    await screen.findByText('Ese Shipment ID ya está registrado');
    expect(screen.queryByText(/es posible que ese envío ya haya/i)).not.toBeInTheDocument();
  });

  it('no registra dos veces si se pulsa de nuevo mientras la función responde', async () => {
    let resolver: (resultado: ResultadoRegistro) => void = () => {};
    vi.mocked(registrarEnvio).mockReturnValue(
      new Promise<ResultadoRegistro>((resolverPromesa) => {
        resolver = resolverPromesa;
      }),
    );
    renderizar();
    const usuario = await capturar('042');
    await usuario.click(botonRegistrar());
    // Mientras responde, el botón dice «Registrando…» y está deshabilitado.
    const enCurso = await screen.findByRole('button', { name: /registrando/i });
    expect(enCurso).toBeDisabled();
    await usuario.click(enCurso);
    expect(registrarEnvio).toHaveBeenCalledTimes(1);
    resolver(confirmado());
    expect(await screen.findByText('Envío registrado')).toBeInTheDocument();
  });

  describe('número económico', () => {
    it('muestra la lista de la empresa y permite elegir una opción', async () => {
      vi.mocked(registrarEnvio).mockResolvedValue(confirmado({ numeroEconomico: '001' }));
      renderizar();
      const usuario = userEvent.setup();
      await usuario.click(campoEconomico());

      const lista = await screen.findByRole('listbox', { name: 'Números económicos' });
      expect(
        within(lista)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual(['001', '042']);

      await usuario.click(within(lista).getByRole('option', { name: '001' }));
      expect(campoEconomico()).toHaveValue('001');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('filtra la lista mientras se escribe', async () => {
      renderizar();
      const usuario = userEvent.setup();
      await usuario.type(campoEconomico(), '04');
      const lista = await screen.findByRole('listbox');
      expect(within(lista).getByRole('option', { name: '042' })).toBeInTheDocument();
      expect(within(lista).queryByRole('option', { name: '001' })).not.toBeInTheDocument();
    });

    it('si el valor no está en la lista, usa lo escrito (mayúsculas, sin símbolos) y se envía', async () => {
      vi.mocked(registrarEnvio).mockResolvedValue(confirmado({ numeroEconomico: 'AB123' }));
      renderizar();
      const usuario = await capturar('ab-123');

      expect(campoEconomico()).toHaveValue('AB123');
      expect(await screen.findByText(/no está en la lista/i)).toBeInTheDocument();

      await usuario.click(botonRegistrar());
      await waitFor(() => expect(registrarEnvio).toHaveBeenCalledTimes(1));
      expect(vi.mocked(registrarEnvio).mock.calls[0]?.[0].numeroEconomico).toBe('AB123');
    });

    it('ofrece «Usar lo escrito» y lo conserva al elegirlo con el teclado', async () => {
      renderizar();
      const usuario = userEvent.setup();
      await usuario.type(campoEconomico(), '777');
      const lista = await screen.findByRole('listbox');
      expect(within(lista).getByText(/usar lo escrito/i)).toBeInTheDocument();

      await usuario.keyboard('{ArrowDown}{Enter}');
      expect(campoEconomico()).toHaveValue('777');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('permite escribirlo a mano aunque la lista no cargue', async () => {
      vi.mocked(listarNumerosEconomicos).mockRejectedValue(new Error('sin conexión'));
      vi.mocked(registrarEnvio).mockResolvedValue(confirmado());
      renderizar();
      const usuario = await capturar('042');

      expect(await screen.findByText(/no pudimos cargar la lista/i)).toBeInTheDocument();
      expect(botonRegistrar()).toBeEnabled();
      await usuario.click(botonRegistrar());
      await waitFor(() => expect(registrarEnvio).toHaveBeenCalledTimes(1));
    });

    it('Enter con la lista abierta no envía el formulario', async () => {
      renderizar();
      const usuario = await capturar('042');
      await usuario.click(campoEconomico());
      await screen.findByRole('listbox');
      await usuario.keyboard('{Enter}');
      expect(registrarEnvio).not.toHaveBeenCalled();
    });
  });

  it('marca el campo inválido solo después de salir de él', async () => {
    renderizar();
    const usuario = userEvent.setup();
    await usuario.type(campoShipment(), '123');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await usuario.tab();
    expect(await screen.findByRole('alert')).toHaveTextContent(/10 dígitos/);
  });
});
