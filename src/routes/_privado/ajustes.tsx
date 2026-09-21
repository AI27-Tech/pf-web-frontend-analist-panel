import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { EncabezadoPagina } from '@/components/EncabezadoPagina';
import { cerrarSesion } from '@/lib/datos/sesion';

export const Route = createFileRoute('/_privado/ajustes')({
  component: Ajustes,
});

function Ajustes() {
  const navegar = useNavigate();

  async function salir() {
    await cerrarSesion();
    navegar({ to: '/login' });
  }

  return (
    <>
      <EncabezadoPagina titulo="Ajustes" />
      <div className="px-8 py-10">
        <button
          type="button"
          onClick={salir}
          className="border-acento text-acento h-12 rounded border px-6 text-sm font-semibold"
        >
          Cerrar sesión
        </button>
      </div>
    </>
  );
}
