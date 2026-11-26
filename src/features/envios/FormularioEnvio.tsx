import { Alert, Button, Card, CardBody, FormField, Input } from '@ai27-tech/ui';
import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  LONGITUD_BITACORA,
  LONGITUD_SHIPMENT_ID,
  TOPE_LINEA_TRANSPORTISTA,
  normalizarBitacora,
  normalizarShipmentId,
  validarEnvio,
  type CampoEnvio,
  type DatosEnvio,
} from '@/lib/datos/reglasEnvio';
import {
  listarNumerosEconomicos,
  registrarEnvio,
  type CausaFalloRegistro,
  type EnvioRegistrado,
} from '@/lib/datos/registroEnvios';
import { NumeroEconomicoCombobox } from './NumeroEconomicoCombobox';

const VACIO: DatosEnvio = {
  shipmentId: '',
  lineaTransportista: '',
  numeroEconomico: '',
  bitacoraLegacyId: '',
};

type Aviso =
  { tipo: 'exito'; envio: EnvioRegistrado } | { tipo: 'fallo'; causa: CausaFalloRegistro };

const MENSAJES_FALLO: Record<CausaFalloRegistro, { titulo: string; detalle: string }> = {
  duplicado: {
    titulo: 'Ese Shipment ID ya está registrado',
    detalle:
      'El envío existente no se modificó. Revisa el Shipment ID; el resto de tu captura sigue aquí.',
  },
  'sin-conexion': {
    titulo: 'No se pudo confirmar el registro',
    detalle:
      'No hubo conexión con el servidor o está ocupado. Tu captura se conservó: revisa tu red e inténtalo de nuevo.',
  },
  'economico-desconocido': {
    titulo: 'No encontramos ese número económico',
    detalle:
      'No hay reportes de esa unidad en tu empresa. Revisa que esté bien escrito; una unidad nueva se puede registrar a partir de su primer reporte.',
  },
  'datos-invalidos': {
    titulo: 'Hay datos que el servidor no aceptó',
    detalle: 'Revisa el Shipment ID y el ID de la bitácora. Tu captura se conservó.',
  },
  'sin-permiso': {
    titulo: 'Tu cuenta no puede registrar envíos',
    detalle: 'Pide a un administrador que revise tu perfil. Tu captura se conservó.',
  },
  desconocida: {
    titulo: 'No se pudo confirmar el registro',
    detalle: 'Ocurrió un error inesperado. Tu captura se conservó: inténtalo de nuevo.',
  },
};

/**
 * Formulario de alta de envíos de Checklist (Echo 06).
 *
 * Pide los cuatro datos del envío y nada más: la empresa la asigna la función de alta desde
 * el perfil de la cuenta. El resultado se muestra solo cuando la función lo confirma:
 *
 * - éxito: se vacía el formulario y el envío pasa a «Registros recientes»;
 * - duplicado o error: la captura se conserva intacta para corregir o reintentar.
 *
 * El número económico se elige de la lista de la empresa o se escribe a mano.
 */
export function FormularioEnvio({
  onRegistrado,
}: {
  onRegistrado: (envio: EnvioRegistrado) => void;
}) {
  const [datos, setDatos] = useState<DatosEnvio>(VACIO);
  const [tocados, setTocados] = useState<ReadonlySet<CampoEnvio>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  // Shipment ID que la función rechazó por duplicado: marca el campo mientras no se edite.
  const [duplicado, setDuplicado] = useState<string | null>(null);
  // Shipment ID cuyo intento se cortó por la conexión. Deja en duda si el alta llegó a
  // persistirse (la respuesta pudo perderse): si el reintento sale «duplicado», puede ser ese
  // mismo envío y no uno ajeno.
  const [perdidoDe, setPerdidoDe] = useState<string | null>(null);
  const enviandoRef = useRef(false);
  const enfocarAlTerminar = useRef(false);
  const shipmentRef = useRef<HTMLInputElement>(null);

  // El campo está deshabilitado mientras se envía: el foco solo puede volver cuando ya se
  // habilitó, no en el mismo manejador que confirma el alta.
  useEffect(() => {
    if (!enviando && enfocarAlTerminar.current) {
      enfocarAlTerminar.current = false;
      shipmentRef.current?.focus();
    }
  }, [enviando]);

  // La lista es una ayuda: si no carga, el campo sigue admitiendo texto libre.
  const numerosQuery = useQuery({
    queryKey: ['envios', 'numeros-economicos'],
    queryFn: listarNumerosEconomicos,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const opciones = useMemo(() => numerosQuery.data ?? [], [numerosQuery.data]);

  const errores = validarEnvio(datos);
  const valido = Object.keys(errores).length === 0;
  const errorVisible = (campo: CampoEnvio) => (tocados.has(campo) ? errores[campo] : undefined);

  function marcarTocado(campo: CampoEnvio) {
    setTocados((previos) => (previos.has(campo) ? previos : new Set(previos).add(campo)));
  }

  function editar(campo: CampoEnvio, valor: string) {
    setDatos((previos) => ({ ...previos, [campo]: valor }));
    // El aviso describe el último intento; una vez que se edita deja de aplicar.
    setAviso(null);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    // Un segundo envío mientras el primero está en vuelo registraría dos veces.
    if (enviandoRef.current || !valido) return;
    enviandoRef.current = true;
    setEnviando(true);
    setAviso(null);
    try {
      const resultado = await registrarEnvio(datos);
      if (resultado.ok) {
        setDatos(VACIO);
        setTocados(new Set());
        setDuplicado(null);
        setPerdidoDe(null);
        setAviso({ tipo: 'exito', envio: resultado.envio });
        onRegistrado(resultado.envio);
        enfocarAlTerminar.current = true;
      } else {
        setDuplicado(resultado.causa === 'duplicado' ? datos.shipmentId : null);
        if (resultado.causa === 'sin-conexion') setPerdidoDe(datos.shipmentId);
        setAviso({ tipo: 'fallo', causa: resultado.causa });
      }
    } catch {
      // `registrarEnvio` no lanza; esto cubre un fallo no previsto sin perder la captura.
      setAviso({ tipo: 'fallo', causa: 'desconocida' });
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  const shipmentDuplicado = duplicado !== null && datos.shipmentId === duplicado;
  const sinListaDisponible = numerosQuery.isError;
  const textoLibre =
    numerosQuery.isSuccess &&
    datos.numeroEconomico !== '' &&
    !opciones.includes(datos.numeroEconomico);

  return (
    <Card variant="outlined">
      <CardBody>
        <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
          <FormField
            label="Shipment ID"
            error={errorVisible('shipmentId')}
            helpText={
              <span className="cifras-tabulares">
                {datos.shipmentId.length}/{LONGITUD_SHIPMENT_ID} dígitos
              </span>
            }
          >
            <Input
              inputRef={shipmentRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="7001886000"
              maxLength={LONGITUD_SHIPMENT_ID}
              value={datos.shipmentId}
              state={shipmentDuplicado || errorVisible('shipmentId') ? 'error' : undefined}
              disabled={enviando}
              onChange={(e) => editar('shipmentId', normalizarShipmentId(e.target.value))}
              onBlur={() => marcarTocado('shipmentId')}
            />
          </FormField>

          <FormField label="Línea transportista" error={errorVisible('lineaTransportista')}>
            <Input
              type="text"
              autoComplete="off"
              placeholder="Transportes del Norte S.A. de C.V."
              maxLength={TOPE_LINEA_TRANSPORTISTA}
              value={datos.lineaTransportista}
              state={errorVisible('lineaTransportista') ? 'error' : undefined}
              disabled={enviando}
              onChange={(e) => editar('lineaTransportista', e.target.value)}
              onBlur={() => marcarTocado('lineaTransportista')}
            />
          </FormField>

          <FormField
            label="Número económico"
            error={errorVisible('numeroEconomico')}
            helpText={
              textoLibre
                ? `«${datos.numeroEconomico}» no está en la lista: se registrará tal como lo escribiste.`
                : sinListaDisponible
                  ? 'No pudimos cargar la lista. Escribe el número económico; se guarda en mayúsculas y sin símbolos.'
                  : 'Elige uno de la lista o escribe el tuyo. Se guarda en mayúsculas y sin símbolos.'
            }
          >
            <NumeroEconomicoCombobox
              value={datos.numeroEconomico}
              onChange={(valor) => editar('numeroEconomico', valor)}
              onBlur={() => marcarTocado('numeroEconomico')}
              opciones={opciones}
              disabled={enviando}
              placeholder={
                numerosQuery.isPending
                  ? 'Cargando números económicos…'
                  : 'Busca o escribe un número económico, ej. 001'
              }
            />
          </FormField>

          <FormField
            label="ID de la bitácora"
            error={errorVisible('bitacoraLegacyId')}
            helpText={
              <span className="cifras-tabulares">
                {datos.bitacoraLegacyId.length}/{LONGITUD_BITACORA} caracteres (AB + 7 dígitos)
              </span>
            }
          >
            <Input
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="AB8398334"
              maxLength={LONGITUD_BITACORA}
              value={datos.bitacoraLegacyId}
              state={errorVisible('bitacoraLegacyId') ? 'error' : undefined}
              disabled={enviando}
              onChange={(e) => editar('bitacoraLegacyId', normalizarBitacora(e.target.value))}
              onBlur={() => marcarTocado('bitacoraLegacyId')}
            />
          </FormField>

          {aviso?.tipo === 'exito' && (
            <Alert variant="success" title="Envío registrado" onDismiss={() => setAviso(null)}>
              Shipment ID {aviso.envio.shipmentId} para el número económico{' '}
              <span className="font-mono">{aviso.envio.numeroEconomico}</span>.
            </Alert>
          )}
          {aviso?.tipo === 'fallo' && (
            <Alert
              variant={aviso.causa === 'duplicado' ? 'warning' : 'danger'}
              title={MENSAJES_FALLO[aviso.causa].titulo}
              onDismiss={() => setAviso(null)}
            >
              {MENSAJES_FALLO[aviso.causa].detalle}
              {aviso.causa === 'duplicado' && perdidoDe === datos.shipmentId && (
                <>
                  {' '}
                  Si el intento anterior se cortó por la conexión, es posible que ese envío ya haya
                  quedado registrado.
                </>
              )}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            loading={enviando}
            disabled={!valido || enviando}
            startIcon={!enviando ? <Send aria-hidden="true" className="size-4" /> : undefined}
          >
            {enviando ? 'Registrando…' : 'Registrar checklist'}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
