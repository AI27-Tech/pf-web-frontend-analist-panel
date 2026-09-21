import { createFileRoute, redirect } from '@tanstack/react-router';

import { AppShell } from '@/app/shell/AppShell';
import { esperarSesion } from '@/lib/datos/sesion';

/**
 * Ruta de las pantallas autenticadas: sólo resuelve la guarda de sesión y monta el
 * `AppShell`, que es quien arma el layout (barra lateral, barra superior y contenido).
 *
 * El guard espera a que Firebase Auth restaure la sesión antes de decidir. Leer
 * `auth.currentUser` directo mandaría al login a un usuario que sí tenía sesión.
 */
export const Route = createFileRoute('/_privado')({
  beforeLoad: async ({ location }) => {
    const usuario = await esperarSesion();
    if (!usuario) {
      // El scaffold no preserva el destino original todavía; cuando el panel tenga
      // enlaces profundos, esto lleva un search param validado.
      void location;
      throw redirect({ to: '/login' });
    }
  },
  component: AppShell,
});
