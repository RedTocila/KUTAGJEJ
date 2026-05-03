/** Constants for the marketplace listing form. */

export const MARKETPLACE_TRANSACTION_OPTIONS = [
  { value: 'shes', label: 'Shes — po shes këtë artikull' },
] as const;

export const MARKETPLACE_CATEGORY_OPTIONS = [
  { value: 'elektronike', label: 'Elektronikë & Teknologji' },
  { value: 'mobilje-shtepi', label: 'Mobilje & Shtëpi' },
  { value: 'veshje-aksesore', label: 'Veshje & Aksesore' },
  { value: 'libra-shkolla', label: 'Libra & Materiale shkollore' },
  { value: 'sport-hobi', label: 'Sport & Hobi' },
  { value: 'lodra', label: 'Lodra & Fëmijë' },
  { value: 'automjete-pjese', label: 'Automjete & Pjesë këmbimi' },
  { value: 'ushqime-bujqesi', label: 'Ushqime & Bujqësi' },
  { value: 'sherbime', label: 'Shërbime' },
  { value: 'te-tjera', label: 'Të tjera' },
] as const;

export const MARKETPLACE_CONDITION_OPTIONS = [
  { value: 'i-ri', label: 'I ri (pa u përdorur)' },
  { value: 'si-i-ri', label: 'Si i ri' },
  { value: 'shume-mire', label: 'Gjendje shumë e mirë' },
  { value: 'mire', label: 'Gjendje e mirë' },
  { value: 'me-defekte', label: 'Me defekte / për pjesë' },
] as const;
