import type { Shadows } from '@mui/material/styles';

/** Slight forest tint on elevations to match the brand greens. */
const e = (y: number, blur: number, spread: number, a: number) =>
  `0px ${y}px ${blur}px ${spread}px rgba(13, 34, 8, ${a})`;

export const shadows = [
  'none',
  e(1, 2, 0, 0.06),
  e(1, 5, 0, 0.07),
  e(1, 8, 0, 0.08),
  e(1, 10, 0, 0.085),
  e(1, 14, 0, 0.09),
  e(1, 18, 0, 0.095),
  e(2, 16, 0, 0.1),
  e(3, 14, 0, 0.1),
  e(3, 16, 0, 0.105),
  e(4, 18, 0, 0.11),
  e(4, 20, 0, 0.115),
  e(5, 22, 0, 0.12),
  e(5, 24, 0, 0.125),
  e(5, 26, 0, 0.13),
  e(6, 28, 0, 0.135),
  e(6, 30, 0, 0.14),
  e(6, 32, 0, 0.145),
  e(7, 34, 0, 0.15),
  e(7, 36, 0, 0.155),
  e(8, 38, 0, 0.16),
  e(8, 40, 0, 0.165),
  e(8, 42, 0, 0.17),
  e(9, 44, 0, 0.175),
  e(9, 46, 0, 0.18),
] satisfies Shadows;
