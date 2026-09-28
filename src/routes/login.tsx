import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Button, Card, CardBody, FormField, Input } from '@ai27-tech/ui';

import { esperarSesion, iniciarSesion } from '@/lib/datos/sesion';

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (await esperarSesion()) throw redirect({ to: '/viajes' });
  },
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await iniciarSesion(email, password);
    setPending(false);
    if (result.ok) navigate({ to: '/viajes' });
    else setError(result.mensaje);
  }

  return (
    <main className="bg-canvas relative flex min-h-screen items-center justify-center p-4 pb-20 sm:p-6">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <CardBody className="px-8 py-8 sm:px-10">
          {/* Cabecera: marca + identificador de sesión operativa. */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <h1 className="text-text text-3xl font-semibold tracking-tight">AI27</h1>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-7" noValidate>
            <FormField label="Correo corporativo">
              <Input
                type="email"
                autoComplete="username"
                placeholder="analista@ai27.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <span className="text-text text-sm font-semibold">Contraseña</span>
                <a
                  href="/recuperar-contrasena"
                  className="text-accent text-xs font-semibold hover:underline"
                >
                  ¿Olvidó su clave?
                </a>
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-label="Contraseña"
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="text-text-muted hover:text-text -mr-1 inline-flex items-center rounded p-1 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="size-4" />
                    ) : (
                      <Eye aria-hidden="true" className="size-4" />
                    )}
                  </button>
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error !== null && (
              <p
                role="alert"
                className="border-danger/40 bg-danger/10 text-danger rounded border px-3 py-2 text-sm"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              loading={pending}
              fullWidth
              size="md"
              disabled={pending || !email || !password}
              startIcon={!pending ? <Lock aria-hidden="true" className="size-4" /> : undefined}
            >
              {pending ? 'Verificando…' : 'Iniciar sesión'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
