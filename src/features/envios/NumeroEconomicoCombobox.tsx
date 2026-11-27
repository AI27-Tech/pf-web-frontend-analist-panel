import { Input } from '@ai27-tech/ui';
import { ChevronDown } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent, type Ref } from 'react';
import { TOPE_NUMERO_ECONOMICO, normalizarEconomico } from '@/lib/datos/reglasEnvio';

export interface NumeroEconomicoComboboxProps {
  /** Valor vigente, ya normalizado (mayúsculas, solo letras y dígitos). */
  value: string;
  onChange: (valor: string) => void;
  onBlur?: () => void;
  /** Números económicos de la empresa, ya normalizados. */
  opciones: readonly string[];
  disabled?: boolean;
  placeholder?: string;
  inputRef?: Ref<HTMLInputElement>;
  /** `FormField` los completa: asocian la etiqueta, la ayuda y el error. */
  id?: string;
  'aria-describedby'?: string;
  invalid?: boolean;
}

/**
 * Campo de número económico: se elige de la lista de la empresa o se escribe a mano.
 *
 * No es el `Select` buscable de la librería porque ése solo emite valores de su lista y
 * aquí el texto libre es un requisito: una unidad que todavía no aparece en la lista debe
 * poder capturarse (la función de alta valida que exista en reportes). Por eso el valor del
 * campo ES el texto: elegir una opción lo reemplaza, y salir del campo lo conserva.
 *
 * Mientras se escribe, el texto se normaliza como lo hace el servidor (mayúsculas, sin
 * símbolos), así lo que se ve es lo que se guarda. Patrón ARIA «combobox con lista».
 */
export function NumeroEconomicoCombobox({
  value,
  onChange,
  onBlur,
  opciones,
  disabled,
  placeholder,
  inputRef,
  id,
  'aria-describedby': describedBy,
  invalid,
}: NumeroEconomicoComboboxProps) {
  const idLista = useId();
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);

  // Con el campo vacío se ve la lista completa; al escribir, solo lo que contiene el texto.
  const filtradas = useMemo(
    () => (value ? opciones.filter((opcion) => opcion.includes(value)) : [...opciones]),
    [opciones, value],
  );
  const existe = opciones.includes(value);
  // Fila final para usar lo escrito. No aparece si ya coincide con una opción de la lista.
  const ofreceTextoLibre = value !== '' && !existe;
  const total = filtradas.length + (ofreceTextoLibre ? 1 : 0);
  // La lista puede encogerse (llegan opciones, cambia el texto) con una fila ya resaltada.
  const activoVigente = activo < total ? activo : -1;
  const idOpcion = (indice: number) => `${idLista}-opcion-${indice}`;

  function abrir() {
    if (!disabled) setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    setActivo(-1);
  }

  function confirmar(indice: number) {
    // La fila de texto libre no cambia el valor: ya es el que está en el campo.
    const elegida = filtradas[indice];
    if (elegida !== undefined) onChange(elegida);
    cerrar();
  }

  function alEscribir(texto: string) {
    onChange(normalizarEconomico(texto));
    setAbierto(true);
    setActivo(-1);
  }

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        if (!abierto) abrir();
        else if (total > 0) setActivo((activoVigente + 1) % total);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        if (!abierto) abrir();
        else if (total > 0) setActivo(activoVigente <= 0 ? total - 1 : activoVigente - 1);
        break;
      case 'Enter':
        // Con la lista abierta, Enter resuelve la lista y no envía el formulario.
        if (abierto) {
          evento.preventDefault();
          if (activoVigente >= 0) confirmar(activoVigente);
          else cerrar();
        }
        break;
      case 'Escape':
        if (abierto) {
          // Solo cierra la lista; no debe cerrar un modal ni limpiar nada más.
          evento.stopPropagation();
          cerrar();
        }
        break;
      case 'Tab':
        cerrar();
        break;
    }
  }

  const mostrarLista = abierto && !disabled && total > 0;

  return (
    <div className="relative">
      <Input
        id={id}
        {...(inputRef ? { inputRef } : {})}
        type="text"
        role="combobox"
        aria-expanded={mostrarLista}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={
          mostrarLista && activoVigente >= 0 ? idOpcion(activoVigente) : undefined
        }
        aria-describedby={describedBy}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        state={invalid ? 'error' : undefined}
        placeholder={placeholder}
        maxLength={TOPE_NUMERO_ECONOMICO}
        disabled={disabled}
        value={value}
        onChange={(evento) => alEscribir(evento.target.value)}
        onFocus={abrir}
        onClick={abrir}
        onBlur={() => {
          cerrar();
          onBlur?.();
        }}
        onKeyDown={alTeclear}
        endAdornment={<ChevronDown className="size-4" aria-hidden="true" />}
      />
      {mostrarLista && (
        <ul
          id={idLista}
          role="listbox"
          aria-label="Números económicos"
          // `mousedown` se detiene para que el campo no pierda el foco (y cierre la lista)
          // antes de que el clic llegue a la opción.
          onMouseDown={(evento) => evento.preventDefault()}
          className="bg-surface-high border-border absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded border py-1 shadow-lg"
        >
          {filtradas.map((opcion, indice) => (
            <Opcion
              key={opcion}
              id={idOpcion(indice)}
              activa={indice === activoVigente}
              seleccionada={opcion === value}
              onElegir={() => confirmar(indice)}
              onResaltar={() => setActivo(indice)}
            >
              {opcion}
            </Opcion>
          ))}
          {ofreceTextoLibre && (
            <Opcion
              id={idOpcion(filtradas.length)}
              activa={activoVigente === filtradas.length}
              seleccionada={false}
              onElegir={() => confirmar(filtradas.length)}
              onResaltar={() => setActivo(filtradas.length)}
            >
              Usar lo escrito: «<span className="font-mono">{value}</span>»
            </Opcion>
          )}
        </ul>
      )}
    </div>
  );
}

function Opcion({
  id,
  activa,
  seleccionada,
  onElegir,
  onResaltar,
  children,
}: {
  id: string;
  activa: boolean;
  seleccionada: boolean;
  onElegir: () => void;
  onResaltar: () => void;
  children: React.ReactNode;
}) {
  return (
    // Las opciones se operan con el teclado desde el campo (flechas y Enter); el clic es la
    // vía del ratón, por eso no llevan su propio manejador de teclado.
    <li
      id={id}
      role="option"
      aria-selected={seleccionada}
      onClick={onElegir}
      onMouseEnter={onResaltar}
      className={`text-text cursor-pointer px-3 py-2 text-sm ${
        activa ? 'bg-surface-highest' : ''
      } ${seleccionada ? 'font-semibold' : ''}`}
    >
      {children}
    </li>
  );
}
