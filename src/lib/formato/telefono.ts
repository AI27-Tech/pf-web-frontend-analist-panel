/**
 * Formateo de teléfonos para el expediente.
 *
 * El contrato entrega el teléfono del custodio en E.164 (`custodioTelefono`, p. ej.
 * `+525563322805`). Esa forma es correcta para almacenar y marcar, pero cuesta leerla
 * de un vistazo. Para la UI se agrupa como `+XX (XXX) XXX XXXX`, separando el código de
 * país de los diez dígitos nacionales (agrupados 3-3-4).
 *
 * Es puramente cosmético: no valida ni cambia el número, sólo lo agrupa. Si el valor no
 * encaja en el patrón esperado (vacío, longitud atípica, o un texto que no es un
 * teléfono como el nombre de respaldo), se devuelve tal cual para no mutilar el dato.
 */
export function formatearTelefono(valor: string | null | undefined): string {
  if (!valor) return '';

  const texto = valor.trim();
  // Sólo intentamos formatear E.164 con `+`; cualquier otra cosa se respeta tal cual.
  if (!texto.startsWith('+')) return texto;

  const digitos = texto.slice(1).replace(/\D/g, '');
  // +52 (2) + nacional (10) = 12 dígitos. Fuera de eso, no arriesgamos y devolvemos el
  // valor original.
  if (digitos.length !== 12) return texto;

  const pais = digitos.slice(0, 2);
  const nacional = digitos.slice(2);
  const a = nacional.slice(0, 3);
  const b = nacional.slice(3, 6);
  const c = nacional.slice(6);

  return `+${pais} (${a}) ${b} ${c}`;
}
