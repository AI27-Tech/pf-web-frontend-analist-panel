import { createFileRoute, redirect } from '@tanstack/react-router';

import { RUTA_INICIAL, cargarPerfil } from '@/lib/datos/accesoPanel';
import { esperarSesion } from '@/lib/datos/sesion';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    if (!(await esperarSesion())) {
      throw redirect({ to: '/login' });
    }
    const perfil = await cargarPerfil();
    if (!perfil) {
      throw redirect({ to: '/sin-acceso' });
    }
    throw redirect({ to: RUTA_INICIAL[perfil.rol] });
  },
});
