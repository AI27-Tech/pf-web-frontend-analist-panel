import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

/**
 * Esta ruta captura las acciones de Firebase Auth (password reset, email verification, etc.)
 * que vienen como /__/auth/action?mode=...&oobCode=...
 *
 * Firebase redirige aquí, y nosotros detectamos el modo y redirigimos a la ruta correspondiente.
 */
export const Route = createFileRoute('/__/auth/action')({
  component: AuthAction,
  validateSearch: (
    search: Record<string, unknown>,
  ): { mode: string; oobCode: string; apiKey?: string | undefined; lang?: string | undefined } => ({
    mode: typeof search.mode === 'string' ? search.mode : '',
    oobCode: typeof search.oobCode === 'string' ? search.oobCode : '',
    apiKey: typeof search.apiKey === 'string' ? search.apiKey : undefined,
    lang: typeof search.lang === 'string' ? search.lang : undefined,
  }),
});

function AuthAction() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  useEffect(() => {
    const { mode, oobCode } = search;

    // Detecta el modo de acción y redirige a la ruta correspondiente
    if (mode === 'resetPassword' && oobCode) {
      // Redirige a reset-contrasena que ya existe
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: '/reset-contrasena', search: { oobCode } } as any);
    } else {
      // Si no hay modo válido o modo no soportado, va a login
      navigate({ to: '/login' });
    }
  }, [search, navigate]);

  return (
    <main className="bg-canvas relative flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <p className="text-text-muted">Procesando...</p>
      </div>
    </main>
  );
}
