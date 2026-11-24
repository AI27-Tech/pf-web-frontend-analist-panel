import { Button } from '@ai27-tech/ui';
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
      <div className="px-4 py-6 sm:px-8 sm:py-10">
        <Button variant="outline" onClick={salir}>
          Cerrar sesión
        </Button>
      </div>
    </>
  );
}
