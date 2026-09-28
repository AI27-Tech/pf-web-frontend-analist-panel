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
            <span className="border-border text-text-muted inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.625rem] tracking-wider">
              <span className="bg-success size-1.5 rounded-full" aria-hidden="true" />
              SEC-ID: OP-27
            </span>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-7" noValidate>
            <FormField label="Correo corporativo">
              <Input
                type="email"
                autoComplete="username"
                placeholder="analista@ai27.forensics.internal"
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

          {/* Aviso legal de acceso restringido. Monoespaciado a propósito: es un banner
              operativo, no prosa. */}
          <div className="border-border text-text-muted mt-10 rounded border px-5 py-4 font-mono text-[0.625rem] leading-relaxed tracking-wide">
            <div className="text-text-muted mb-3 flex items-center justify-between gap-4 font-semibold">
              <span className="flex items-center gap-2">
                <Lock aria-hidden="true" className="size-3" />
                ACCESO RESTRINGIDO
              </span>
              <span>AUTH_V4.8.2</span>
            </div>
            <p className="leading-loose uppercase">
              Uso exclusivo // personal autorizado de investigación. Cualquier intento de acceso no
              certificado será registrado en la bitácora de auditoría forense.
            </p>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
