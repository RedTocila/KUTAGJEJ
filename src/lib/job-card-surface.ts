/** Muted dark solids — readable with light text. Same family per listing id. */
const JOB_CARD_SURFACE_PALETTE = [
  { bg: '#1c2618', accent: '#8DFF2A', muted: '#4a6b32' },
  { bg: '#151f2e', accent: '#7dd3fc', muted: '#2d4f7c' },
  { bg: '#221638', accent: '#c4b5fd', muted: '#5b3f8f' },
  { bg: '#2a1810', accent: '#fdba74', muted: '#8a4a24' },
  { bg: '#102830', accent: '#67e8f9', muted: '#1f6678' },
  { bg: '#28121f', accent: '#f9a8d4', muted: '#8a3058' },
  { bg: '#1e2612', accent: '#bef264', muted: '#4f6b28' },
] as const;

function paletteIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % JOB_CARD_SURFACE_PALETTE.length;
}

function hexAlpha(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function resolveJobCardSurface(listingId: string) {
  const { bg, accent, muted } = JOB_CARD_SURFACE_PALETTE[paletteIndex(listingId)];

  const fg = {
    primary: 'rgba(255, 255, 255, 0.94)',
    secondary: 'rgba(255, 255, 255, 0.72)',
    disabled: 'rgba(255, 255, 255, 0.5)',
  };

  return {
    accent,
    muted,
    fg,
    shellSx: {
      backgroundColor: bg,
      backgroundImage: 'none',
      borderColor: hexAlpha(accent, 0.28),
      color: fg.primary,
    },
    insetSx: {
      bgcolor: 'rgba(0, 0, 0, 0.28)',
      borderTop: `1px solid ${hexAlpha(accent, 0.22)}`,
      borderRight: `1px solid ${hexAlpha(accent, 0.22)}`,
      borderBottom: `1px solid ${hexAlpha(accent, 0.22)}`,
      borderLeft: `3px solid ${accent}`,
      color: fg.primary,
    },
    iconSx: {
      bgcolor: hexAlpha(accent, 0.12),
      borderColor: hexAlpha(accent, 0.32),
      color: accent,
    },
    tagSx: {
      borderColor: hexAlpha(accent, 0.32),
      color: fg.secondary,
    },
    actionSx: {
      color: fg.secondary,
      borderColor: 'rgba(255, 255, 255, 0.22)',
      '&:hover': {
        borderColor: hexAlpha(accent, 0.55),
        color: fg.primary,
        bgcolor: hexAlpha(accent, 0.1),
      },
    },
  };
}
