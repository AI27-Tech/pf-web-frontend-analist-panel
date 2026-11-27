import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { AppShell } from '@/app/shell/AppShell';
import { RUTA_INICIAL, cargarPerfil, observarPerfil, puedeAcceder } from '@/lib/datos/accesoPanel';
import { esperarSesion } from '@/lib/datos/sesion';

/**
 * Ruta de las pantallas autenticadas: resuelve la sesión, el perfil y la sección
 * permitida, y monta el `AppShell`.
 *
 * El guard espera a que Firebase Auth restaure la sesión antes de decidir. Leer
 * `auth.currentUser` directo mandaría al login a un usuario que sí tenía sesión.
 *
 * La autorización real vive en las reglas de Firestore y Storage; esto sólo evita
 * pintar una sección que la cuenta no puede leer.
 */
export const Route = createFileRoute('/_privado')({
  beforeLoad: async ({ location }) => {
    if (!(await esperarSesion())) {
      throw redirect({ to: '/login' });
    }
    const perfil = await cargarPerfil();
    if (!perfil) {
      throw redirect({ to: '/sin-acceso' });
    }
    if (!puedeAcceder(perfil, location.pathname)) {
      throw redirect({ to: RUTA_INICIAL[perfil.rol] });
    }
    return { perfil };
  },
  component: Privado,
});

function Privado() {
  const { perfil } = Route.useRouteContext();
  const navegar = useNavigate();

  // Una baja de perfil a media sesión saca de inmediato. Las reglas ya negarían cada
  // lectura, pero el usuario debe ver el motivo y no un error de datos.
  useEffect(
    () =>
      observarPerfil((nuevo) => {
        if (!nuevo) navegar({ to: '/sin-acceso' });
      }),
    [navegar],
  );

  return <AppShell perfil={perfil} />;
}
