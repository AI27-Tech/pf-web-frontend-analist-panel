import { Button, FormField, Input, Modal } from '@ai27-tech/ui';
import { useState } from 'react';

import { corregirVinculacion, obtenerEnvio } from '@/lib/datos/envios';
import type { Envio, EnvioSeguimiento } from '@/lib/datos/tipos';

/**
 * Corrección del vínculo de un seguimiento, sólo para el Analista. Elige un destino por
 * Shipment ID o «Sin envío»; antes de guardar muestra a qué envío se mueve el seguimiento
 * y advierte que los totales de ambos cambian. El destino inexistente o de otra empresa
 * deshabilita el guardado; la autorización real la da la regla de 01.
 */
export interface CorregirVinculoModalProps {
  seguimiento: EnvioSeguimiento;
  onCerrar: () => void;
  /** El vínculo ya se guardó: la vista del envío debe releer. */
  onGuardado: () => void;
}

export function CorregirVinculoModal({
  seguimiento,
  onCerrar,
  onGuardado,
}: CorregirVinculoModalProps) {
  const [modo, setModo] = useState<'envio' | 'sin'>('envio');
  const [texto, setTexto] = useState('');
  const [destino, setDestino] = useState<Envio | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorDestino, setErrorDestino] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function validarDestino(valor: string): Promise<void> {
    setBuscando(true);
    setErrorDestino(null);
    setDestino(null);
    try {
      const envio = await obtenerEnvio(valor.trim());
      if (!envio) {
        setErrorDestino('No encontramos el envío.');
        return;
      }
      if (envio.clienteId !== seguimiento.clienteId) {
        setErrorDestino('El envío es de otra empresa.');
        return;
      }
      setDestino(envio);
    } finally {
      setBuscando(false);
    }
  }

  async function guardar(): Promise<void> {
    setGuardando(true);
    setMensaje(null);
    const resultado = await corregirVinculacion({
      reporteId: seguimiento.id,
      shipmentId: modo === 'sin' ? null : (destino?.shipmentId ?? null),
    });
    setGuardando(false);
    if (!resultado.ok) {
      setMensaje(resultado.mensaje);
      return;
    }
    if (!resultado.cambio) {
      setMensaje('El seguimiento ya está vinculado a ese envío. No se escribió nada.');
      return;
    }
    onGuardado();
  }

  const puedeGuardar = modo === 'sin' || destino !== null;

  return (
    <Modal
      open
      onClose={onCerrar}
      size="md"
      title="Corregir vínculo"
      footer={
        <>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={() => void guardar()} disabled={guardando || !puedeGuardar}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <p className="text-text-muted text-xs">
        Seguimiento {seguimiento.id} · Número económico {seguimiento.placas || 'S/N.E.'} ·{' '}
        {seguimiento.fechaLocal}
      </p>

      <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Destino del vínculo">
        <Button
          type="button"
          variant={modo === 'envio' ? 'primary' : 'outline'}
          role="radio"
          aria-checked={modo === 'envio'}
          onClick={() => {
            setModo('envio');
            setMensaje(null);
          }}
        >
          Mover a un envío
        </Button>
        <Button
          type="button"
          variant={modo === 'sin' ? 'primary' : 'outline'}
          role="radio"
          aria-checked={modo === 'sin'}
          onClick={() => {
            setModo('sin');
            setMensaje(null);
          }}
        >
          Sin envío
        </Button>
      </div>

      {modo === 'envio' ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-end gap-2">
            <FormField label="Shipment ID del destino">
              <Input
                placeholder="S-103"
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
              />
            </FormField>
            <Button
              type="button"
              variant="outline"
              disabled={!texto.trim() || buscando}
              onClick={() => void validarDestino(texto)}
            >
              {buscando ? 'Buscando…' : 'Buscar'}
            </Button>
          </div>
          {errorDestino && (
            <p role="alert" className="text-xs text-red-400">
              {errorDestino}
            </p>
          )}
          {destino && (
            <>
              <p className="text-text text-xs">
                Se moverá a{' '}
                <span className="font-mono">
                  {destino.shipmentId} · {destino.lineaTransportista} ({destino.numeroEconomico})
                </span>
                .
              </p>
              <p role="note" className="text-text-muted text-xs">
                Los totales del envío actual y de {destino.shipmentId} cambiarán.
              </p>
            </>
          )}
        </div>
      ) : (
        <p role="note" className="text-text-muted mt-4 text-xs">
          El seguimiento quedará sin envío y saldrá de los totales de su envío actual.
        </p>
      )}

      {mensaje && (
        <p role="alert" className="mt-3 text-xs text-amber-400">
          {mensaje}
        </p>
      )}
    </Modal>
  );
}
