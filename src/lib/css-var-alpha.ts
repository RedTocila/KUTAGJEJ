/**
 * Tints using MUI CSS variable **channels** — works with `CssVarsProvider` + SSR.
 * Do not use `alpha(theme.palette.primary.main, …)`; `palette.*.main` is often
 * `var(--mui-palette-…)` which `alpha()` cannot parse (MUI error #9).
 */
export function primaryMainAlpha(opacity: number): string {
  return `rgba(var(--mui-palette-primary-mainChannel) / ${opacity})`;
}

export function secondaryMainAlpha(opacity: number): string {
  return `rgba(var(--mui-palette-secondary-mainChannel) / ${opacity})`;
}

export function warningMainAlpha(opacity: number): string {
  return `rgba(var(--mui-palette-warning-mainChannel) / ${opacity})`;
}

export function errorMainAlpha(opacity: number): string {
  return `rgba(var(--mui-palette-error-mainChannel) / ${opacity})`;
}

export function infoMainAlpha(opacity: number): string {
  return `rgba(var(--mui-palette-info-mainChannel) / ${opacity})`;
}
