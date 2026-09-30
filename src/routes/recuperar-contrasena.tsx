import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { AlertCircle, ArrowLeft, Mail, Send } from 'lucide-react';
import { Button, Card, CardBody, FormField, Input } from '@ai27-tech/ui';

import { enviarEmailDeReset } from '@/lib/datos/sesion';

export const Route = createFileRoute('/recuperar-contrasena')({
  component: RecuperarContrasena,
});

type Estado = 'idle' | 'loading' | 'success' | 'error';

function RecuperarContrasena() {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [estado, setEstado] = useState<Estado>('idle');
  const [error, setError] = useState<string | null>(null);

  // Validación básica de email
  function esEmailValido(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  async function handleEnviar(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!correo.trim()) {
      setError('Por favor ingresa tu correo.');
      return;
    }

    if (!esEmailValido(correo)) {
      setError('El correo no tiene un formato válido.');
      return;
    }

    setEstado('loading');
    const resultado = await enviarEmailDeReset(correo);
    setEstado('idle');

    if (resultado.ok) {
      setEstado('success');
      setCorreo('');
    } else {
      setError(resultado.mensaje);
    }
  }

  function handleReiniciar() {
    setEstado('idle');
    setError(null);
    setCorreo('');
  }

  return (
    <main className="bg-canvas relative flex min-h-screen items-center justify-center p-4 pb-20 sm:p-6">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <CardBody className="px-8 py-8 sm:px-10">
          {/* Cabecera */}
          <div className="mb-8 flex items-center gap-3">
            <button
              onClick={() => navigate({ to: '/login' })}
              className="text-text-muted hover:text-text -ml-1 inline-flex items-center rounded p-1 transition-colors"
              aria-label="Volver a login"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </button>
            <div>
              <h1 className="text-text text-2xl font-semibold tracking-tight">Recupera tu clave</h1>
              <p className="text-text-muted text-sm">Te enviaremos un enlace a tu correo</p>
            </div>
          </div>

          {/* Contenido según estado */}
          {estado === 'success' ? (
            <div className="space-y-6">
              {/* Mensaje de éxito */}
              <div className="bg-success/10 border-success/40 rounded border px-4 py-3">
                <p className="text-success text-sm font-semibold">
                  ✓ Hemos enviado un enlace a {correo}
                </p>
              </div>

              <div className="text-text-muted space-y-4 text-sm">
                <p>
                  Revisa tu bandeja de entrada (o spam) y haz clic en el enlace. Es válido por{' '}
                  <span className="font-semibold">1 hora</span>.
                </p>
                <p>
                  Si no recibiste nada, verifica que el correo sea el correcto o intenta nuevamente.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleReiniciar}
                  variant="secondary"
                  fullWidth
                  size="md"
                >
                  Intentar con otro correo
                </Button>
                <Button
                  type="button"
                  onClick={() => navigate({ to: '/login' })}
                  variant="ghost"
                  fullWidth
                  size="md"
                >
                  Volver a login
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEnviar} className="flex flex-col gap-6" noValidate>
              <FormField label="Correo corporativo">
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="analista@ai27.forensics.internal"
                  value={correo}
                  onChange={(e) => {
                    setCorreo(e.target.value);
                    setError(null);
                  }}
                  disabled={estado === 'loading'}
                  endAdornment={<Mail aria-hidden="true" className="text-text-muted size-4" />}
                />
              </FormField>

              {error !== null && (
                <div
                  role="alert"
                  className="border-danger/40 bg-danger/10 text-danger flex items-start gap-2 rounded border px-3 py-2 text-sm"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 size-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button
                type="submit"
                loading={estado === 'loading'}
                fullWidth
                size="md"
                disabled={estado === 'loading' || !correo.trim()}
                startIcon={
                  estado !== 'loading' ? <Send aria-hidden="true" className="size-4" /> : undefined
                }
              >
                {estado === 'loading' ? 'Enviando…' : 'Enviar enlace'}
              </Button>
            </form>
          )}

          {/* Pie */}
          <div className="border-border text-text-muted mt-8 border-t pt-6 text-center text-xs">
            <p>
              ¿Recuerdas tu clave?{' '}
              <button
                type="button"
                onClick={() => navigate({ to: '/login' })}
                className="text-accent font-semibold hover:underline"
              >
                Vuelve a login
              </button>
            </p>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
