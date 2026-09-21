import { createFileRoute, Outlet } from '@tanstack/react-router';

/**
 * Layout de rutas de DESARROLLO. No lleva guard de sesión a propósito: sirve para
 * ver features en aislamiento —el visor, sobre todo— sin login, Firebase ni
 * emulador. No forma parte del producto y se borra cuando ya no haga falta.
 */
export const Route = createFileRoute('/_dev')({
  component: () => <Outlet />,
});
