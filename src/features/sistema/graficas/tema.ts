/**
 * Paleta y estilos de las gráficas, tomados de los tokens de `globales.css`. Se pasan
 * como cadenas `var(--…)` a recharts, que las resuelve contra el DOM, así el tema
 * claro/oscuro las hereda sin recalcular nada. No se define ni un color aquí.
 *
 * Viven aparte de `PanelGrafica` para que ese archivo exporte sólo componentes.
 */

export const COLORES = {
  accent: 'var(--color-accent)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  muted: 'var(--color-text-muted)',
  borde: 'var(--color-border)',
} as const;

/** Estilo del tooltip de recharts, alineado a las superficies del tema. */
export const ESTILO_TOOLTIP = {
  backgroundColor: 'var(--color-surface-high)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  color: 'var(--color-text)',
  fontSize: '12px',
} as const;
