/** Resolve a select option label from its stored value. */
export function findOptionLabel<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | null | undefined
): string {
  if (!value) return '';
  return options.find((option) => option.value === value)?.label ?? value;
}
