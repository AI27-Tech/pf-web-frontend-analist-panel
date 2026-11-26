import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EnvioBuscador } from './EnvioBuscador';

describe('EnvioBuscador', () => {
  it('no busca con el texto vacío', () => {
    const onBuscar = vi.fn();
    render(<EnvioBuscador onBuscar={onBuscar} onLimpiar={vi.fn()} />);

    const boton = screen.getByRole('button', { name: 'Ver envío' });
    expect(boton).toBeDisabled();
  });

  it('busca el Shipment ID escrito al enviar el formulario', () => {
    const onBuscar = vi.fn();
    render(<EnvioBuscador onBuscar={onBuscar} onLimpiar={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('S-100'), { target: { value: ' S-103 ' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Ver envío' }).closest('form')!);

    expect(onBuscar).toHaveBeenCalledWith('S-103');
  });

  it('con un envío activo muestra «Volver al tablero» y lo invoca', () => {
    const onLimpiar = vi.fn();
    render(<EnvioBuscador envioActivo="S-100" onBuscar={vi.fn()} onLimpiar={onLimpiar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Volver al tablero' }));

    expect(onLimpiar).toHaveBeenCalledOnce();
  });
});
