import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { Button, Card, CardBody, FormField, Input } from '@ai27-tech/ui';

import { confirmReset, validarCodigoDeReset } from '@/lib/datos/sesion';

export const Route = createFileRoute('/reset-contrasena')({
  component: ResetContrasena,
  validateSearch: (search: Record<string, unknown>) => ({
    oobCode: (search.oobCode as string) || '',
  }),
});

type Estado = 'validando' | 'invalido' | 'listo' | 'loading' | 'success' | 'error';

type ErroresValidacion = {
  nuevaContrasena?: string | undefined;
  confirmarContrasena?: string | undefined;
};

function ResetContrasena() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const oobCode = search.oobCode;

  const [estado, setEstado] = useState<Estado>('validando');
  const [emailDelCodigo, setEmailDelCodigo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulario
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarNuevaContrasena, setMostrarNuevaContrasena] = useState(false);
  const [mostrarConfirmarContrasena, setMostrarConfirmarContrasena] = useState(false);
  const [erroresValidacion, setErroresValidacion] = useState<ErroresValidacion>({});

  // Al montar, valida el código del email
  useEffect(() => {
    async function validarCodigo() {
      if (!oobCode) {
        setEstado('invalido');
        setError('No se proporcionó un código de reset válido.');
        return;
      }

      const resultado = await validarCodigoDeReset(oobCode);
      if (resultado.ok) {
        setEmailDelCodigo(resultado.email);
        setEstado('listo');
      } else {
        setEstado('invalido');
        setError(resultado.mensaje);
      }
    }

    validarCodigo();
  }, [oobCode]);

  function validarContraseñas(): { validas: boolean; errores: ErroresValidacion } {
    const errores: ErroresValidacion = {};

    if (!nuevaContrasena) {
      errores.nuevaContrasena = 'La contraseña es requerida.';
    } else if (nuevaContrasena.length < 8) {
      errores.nuevaContrasena = 'Mínimo 8 caracteres.';
    }

    if (!confirmarContrasena) {
      errores.confirmarContrasena = 'Debes confirmar la contraseña.';
    } else if (nuevaContrasena !== confirmarContrasena) {
      errores.confirmarContrasena = 'Las contraseñas no coinciden.';
    }

    return {
      validas: Object.keys(errores).length === 0,
      errores,
    };
  }

  async function handleConfirmar(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setErroresValidacion({});

    const { validas, errores } = validarContraseñas();
    if (!validas) {
      setErroresValidacion(errores);
      return;
    }

    setEstado('loading');
    const resultado = await confirmReset(oobCode, nuevaContrasena);
    setEstado('listo');

    if (resultado.ok) {
      setEstado('success');
    } else {
      setError(resultado.mensaje);
      setEstado('listo');
    }
  }

  // ==================== RENDERIZADOS POR ESTADO ====================

  // Estado: validando
  if (estado === 'validando') {
    return (
      <main className="bg-canvas relative flex min-h-screen items-center justify-center p-4 pb-20 sm:p-6">
        <Card variant="elevated" padding="lg" className="w-full max-w-md">
          <CardBody className="flex items-center justify-center px-8 py-16 sm:px-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="border-accent/20 border-t-accent size-10 animate-spin rounded-full border-4" />
              <p className="text-text-muted text-sm">Verificando tu enlace...</p>
            </div>
          </CardBody>
        </Card>
      </main>
    );
  }

  // Estado: inválido
  if (estado === 'invalido') {
    return (
      <main className="bg-canvas relative flex min-h-screen items-center justify-center p-4 pb-20 sm:p-6">
        <Card variant="elevated" padding="lg" className="w-full max-w-md">
          <CardBody className="px-8 py-8 sm:px-10">
            <div className="mb-6 flex items-center gap-3">
              <button
                onClick={() => navigate({ to: '/login' })}
                className="text-text-muted hover:text-text -ml-1 inline-flex items-center rounded p-1 transition-colors"
                aria-label="Volver a login"
              >
                <ArrowLeft aria-hidden="true" className="size-5" />
              </button>
              <h1 className="text-text text-2xl font-semibold">Enlace inválido</h1>
            </div>

            <div className="space-y-6">
              <div
                role="alert"
                className="border-danger/40 bg-danger/10 text-danger flex items-start gap-2 rounded border px-3 py-2 text-sm"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 flex-shrink-0" />
                <p>{error}</p>
              </div>

              <p className="text-text-muted text-sm">
                El enlace de reset es inválido o ha expirado. Solicita uno nuevo para continuar.
              </p>

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={() => navigate({ to: '/recuperar-contrasena' })}
                  fullWidth
                  size="md"
                >
                  Solicitar nuevo enlace
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
          </CardBody>
        </Card>
      </main>
    );
  }

  // Estado: success
  if (estado === 'success') {
    return (
      <main className="bg-canvas relative flex min-h-screen items-center justify-center p-4 pb-20 sm:p-6">
        <Card variant="elevated" padding="lg" className="w-full max-w-md">
          <CardBody className="flex flex-col items-center px-8 py-10 text-center sm:px-10">
            <div className="mb-6">
              <CheckCircle aria-hidden="true" className="text-success mx-auto size-12" />
            </div>

            <h1 className="text-text mb-2 text-2xl font-semibold">Contraseña actualizada</h1>
            <p className="text-text-muted mb-8 text-sm">
              Tu contraseña ha sido cambiada exitosamente. Redirigiendo a login...
            </p>

            <Button
              type="button"
              onClick={() => navigate({ to: '/login', replace: true })}
              fullWidth
              size="md"
              variant="secondary"
            >
              Ir a login ahora
            </Button>

            {/* Auto-redirigir después de 2 segundos */}
            {typeof window !== 'undefined' &&
              setTimeout(() => {
                navigate({ to: '/login', replace: true });
              }, 2000)}
          </CardBody>
        </Card>
      </main>
    );
  }

  // Estado: listo o error
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
              <h1 className="text-text text-2xl font-semibold tracking-tight">
                Elige una nueva contraseña
              </h1>
              <p className="text-text-muted text-sm">Para {emailDelCodigo}</p>
            </div>
          </div>

          <form onSubmit={handleConfirmar} className="flex flex-col gap-6" noValidate>
            {/* Nueva contraseña */}
            <div>
              <FormField label="Nueva contraseña">
                <Input
                  type={mostrarNuevaContrasena ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-label="Nueva contraseña"
                  placeholder="Mínimo 8 caracteres"
                  value={nuevaContrasena}
                  onChange={(e) => {
                    setNuevaContrasena(e.target.value);
                    setErroresValidacion((prev) => ({ ...prev, nuevaContrasena: undefined }));
                  }}
                  disabled={estado === 'loading'}
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setMostrarNuevaContrasena((value) => !value)}
                      aria-pressed={mostrarNuevaContrasena}
                      aria-label={
                        mostrarNuevaContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'
                      }
                      className="text-text-muted hover:text-text -mr-1 inline-flex items-center rounded p-1 transition-colors"
                    >
                      {mostrarNuevaContrasena ? (
                        <EyeOff aria-hidden="true" className="size-4" />
                      ) : (
                        <Eye aria-hidden="true" className="size-4" />
                      )}
                    </button>
                  }
                />
              </FormField>
              {erroresValidacion.nuevaContrasena && (
                <p className="text-danger mt-2 text-xs font-semibold">
                  {erroresValidacion.nuevaContrasena}
                </p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <FormField label="Confirmar contraseña">
                <Input
                  type={mostrarConfirmarContrasena ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-label="Confirmar contraseña"
                  placeholder="Repite la contraseña"
                  value={confirmarContrasena}
                  onChange={(e) => {
                    setConfirmarContrasena(e.target.value);
                    setErroresValidacion((prev) => ({ ...prev, confirmarContrasena: undefined }));
                  }}
                  disabled={estado === 'loading'}
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmarContrasena((value) => !value)}
                      aria-pressed={mostrarConfirmarContrasena}
                      aria-label={
                        mostrarConfirmarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'
                      }
                      className="text-text-muted hover:text-text -mr-1 inline-flex items-center rounded p-1 transition-colors"
                    >
                      {mostrarConfirmarContrasena ? (
                        <EyeOff aria-hidden="true" className="size-4" />
                      ) : (
                        <Eye aria-hidden="true" className="size-4" />
                      )}
                    </button>
                  }
                />
              </FormField>
              {erroresValidacion.confirmarContrasena && (
                <p className="text-danger mt-2 text-xs font-semibold">
                  {erroresValidacion.confirmarContrasena}
                </p>
              )}
            </div>

            {/* Error general */}
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
              disabled={
                estado === 'loading' ||
                !nuevaContrasena.trim() ||
                !confirmarContrasena.trim() ||
                nuevaContrasena !== confirmarContrasena
              }
              startIcon={
                estado !== 'loading' ? <Lock aria-hidden="true" className="size-4" /> : undefined
              }
            >
              {estado === 'loading' ? 'Cambiando…' : 'Cambiar contraseña'}
            </Button>
          </form>

          {/* Pie */}
          <div className="border-border text-text-muted mt-8 border-t pt-6 text-center text-xs">
            <p>
              ¿Problemas?{' '}
              <button
                type="button"
                onClick={() => navigate({ to: '/recuperar-contrasena' })}
                className="text-accent font-semibold hover:underline"
              >
                Solicita un nuevo enlace
              </button>
            </p>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
