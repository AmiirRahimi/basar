/**
 * Shared stacking scale. Keep CSS tokens, Tailwind `z-*` keys, and JS
 * (DatePicker) aligned with these values.
 *
 * header < modal < dropdown/popover < overlay < toast < tooltip
 */
export const zIndex = {
  header: 40,
  sidebar: 50,
  modal: 1000,
  dropdown: 1100,
  popover: 1100,
  overlay: 10050,
  toast: 1200,
  tooltip: 1300,
} as const;

export type ZIndexLayer = keyof typeof zIndex;
