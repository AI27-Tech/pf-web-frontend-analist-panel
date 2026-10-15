import { Button, Card, CardBody, FormField, Input } from '@ai27-tech/ui';
import { AlertCircle, CheckCircle, Send } from 'lucide-react';
import { useState } from 'react';

import { crearCustodioYEsperar } from '@/lib/datos/administracion';

type EstadoFormulario = 'reposo' | 'enviando' | 'exito' | 'error';

/**
 * Formulario para solicitar la creación de un custodio nuevo.
 *
 * Inputs:
 * - ID de Unidad: B, 4 dígitos (ej: "B2688")
 * - Extensión país: +52 (México, fijo)
 * - Número teléfono: 10 dígitos (ej: "5500000001")
 *
 * Genera automáticamente:
 * - Correo: b2688@ai27.com
 * - Contraseña: Bravo-b2688-ai27
 * - Nombre: B2688
 */
export function FormularioCustodio() {
  const [idUnidad, setIdUnidad] = useState('');
  const [numeroTelefono, setNumeroTelefono] = useState('');

  const [estado, setEstado] = useState<EstadoFormulario>('reposo');
  const [mensaje, setMensaje] = useState<string>('');

  const estaProcesando = estado === 'enviando';

  // Handler para ID de unidad: solo acepta B + 4 dígitos
  function onChangeIdUnidad(value: string) {
    const cleaned = value.toUpperCase().replace(/[^B0-9]/g, '');
    if (cleaned.length <= 5) {
      // Formatea como B####
      if (cleaned.startsWith('B')) {
        const digitos = cleaned.slice(1);
        setIdUnidad('B' + digitos);
      } else {
        setIdUnidad(cleaned);
      }
    }
  }

  // Handler para número teléfono: solo 10 dígitos con formato XXXX-XXX-XXXX
  function onChangeNumeroTelefono(value: string) {
    const cleaned = value.replace(/\D/g, '').slice(0, 10);

    // Formatea como XXXX-XXX-XXXX
    let formateado = '';
    if (cleaned.length > 0) {
      formateado = cleaned.slice(0, 4);
      if (cleaned.length > 4) {
        formateado += ' ' + cleaned.slice(4, 7);
        if (cleaned.length > 7) {
          formateado += ' ' + cleaned.slice(7, 10);
        }
      }
    }

    setNumeroTelefono(formateado);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setEstado('enviando');
    setMensaje('');

    try {
      // Convertir formato a E.164
      const numeroLimpio = numeroTelefono.replace(/\D/g, '');
      const telefonoE164 = `+52${numeroLimpio}`;

      // Crea la solicitud y ESPERA a que la Cloud Function la resuelva.
      // El botón queda en estado "enviando" durante toda la espera.
      const resultado = await crearCustodioYEsperar({
        idUnidad: idUnidad.trim(),
        telefono: telefonoE164,
      });

      if (resultado.ok) {
        setEstado('exito');
        setMensaje(resultado.mensaje);

        // Limpiar formulario después de 2 segundos
        setTimeout(() => {
          setIdUnidad('');
          setNumeroTelefono('');
          setEstado('reposo');
          setMensaje('');
        }, 2000);
      } else {
        setEstado('error');
        setMensaje(resultado.mensaje);
      }
    } catch (error) {
      setEstado('error');
      setMensaje(error instanceof Error ? error.message : 'Error desconocido');
    }
  }

  // Validación: B + exactamente 4 dígitos + 10 dígitos de teléfono
  const tieneIdValido = /^B\d{4}$/.test(idUnidad);
  const tienePhoneValido = numeroTelefono.replace(/\D/g, '').length === 10;
  const puedeEnviar = tieneIdValido && tienePhoneValido && !estaProcesando;

  return (
    <Card variant="outlined">
      <CardBody className="flex flex-col gap-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          {/* ID de Unidad */}
          <FormField label="ID de Unidad (B + 4 dígitos)">
            <Input
              type="text"
              placeholder="B2688"
              value={idUnidad}
              onChange={(e) => onChangeIdUnidad(e.target.value)}
              maxLength={5}
              disabled={estaProcesando}
              aria-label="ID de Unidad"
            />
            <p className="text-text-muted mt-1 text-xs">{idUnidad.length}/5 caracteres</p>
          </FormField>

          {/* Teléfono con prefijo +52 fijo */}
          <FormField label="Número (10 dígitos)">
            <Input
              type="tel"
              placeholder="5500 000 0001"
              value={numeroTelefono}
              onChange={(e) => onChangeNumeroTelefono(e.target.value)}
              maxLength={14}
              disabled={estaProcesando}
              aria-label="Número de teléfono"
              startAdornment={<span className="text-text-muted font-medium select-none">+52</span>}
            />
            <p className="text-text-muted mt-1 text-xs">
              {numeroTelefono.replace(/\D/g, '').length}/10 dígitos
            </p>
          </FormField>

          {/* Datos generados automáticamente */}
          {tieneIdValido && (
            <div className="bg-surface-alt text-text-muted space-y-1 rounded p-3 text-xs">
              <p>
                <span className="font-semibold">Correo:</span> {idUnidad.toLowerCase()}@ai27.com
              </p>
              <p>
                <span className="font-semibold">Contraseña:</span> Bravo-{idUnidad.toLowerCase()}
                -ai27
              </p>
              <p>
                <span className="font-semibold">Nombre:</span> {idUnidad.toUpperCase()}
              </p>
              {tienePhoneValido && (
                <p>
                  <span className="font-semibold">Teléfono:</span> +52
                  {numeroTelefono.replace(/\D/g, '')}
                </p>
              )}
            </div>
          )}

          {/* Mensaje de estado */}
          {mensaje && (
            <div
              role="alert"
              className={`flex items-start gap-3 rounded border px-4 py-3 text-sm ${
                estado === 'exito'
                  ? 'border-secure/40 bg-secure/10 text-secure'
                  : estado === 'error'
                    ? 'border-warning/40 bg-warning/10 text-warning'
                    : 'border-info/40 bg-info/10 text-info'
              }`}
            >
              {estado === 'exito' ? (
                <CheckCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              )}
              <p>{mensaje}</p>
            </div>
          )}

          {/* Botón enviar */}
          <Button
            type="submit"
            loading={estaProcesando}
            fullWidth
            disabled={!puedeEnviar}
            startIcon={!estaProcesando ? <Send aria-hidden="true" className="size-4" /> : undefined}
          >
            {estaProcesando ? 'Creando custodio…' : 'Agregar Custodio'}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
