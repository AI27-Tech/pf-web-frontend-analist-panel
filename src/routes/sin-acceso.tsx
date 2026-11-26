import { Button } from '@ai27-tech/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { cerrarSesion } from '@/lib/datos/sesion';

export const Route = createFileRoute('/sin-acceso')({
  component: SinAcceso,
});

/** Cuenta autenticada sin perfil válido: no se le abre ninguna sección por omisión. */
function SinAcceso() {
  const navegar = useNavigate();

  async function salir() {
    await cerrarSesion();
    navegar({ to: '/login' });
  }

  return (
    <main className="bg-canvas flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h1 className="text-text text-2xl font-semibold tracking-tight">Sin acceso al panel</h1>
        <p className="text-text-muted mt-3 text-sm">
          Esta cuenta no tiene un perfil de acceso válido. Pide a un administrador que la registre
          con un rol.
        </p>
        <Button variant="outline" className="mt-6" onClick={salir}>
          Cerrar sesión
        </Button>
      </div>
    </main>
  );
}
