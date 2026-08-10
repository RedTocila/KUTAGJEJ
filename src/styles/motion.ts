/**
 * Shared motion tokens — keep interactions short so the UI feels responsive,
 * not ornamental. Prefer transform + opacity over layout properties.
 */
export const MOTION = {
  fast: '140ms',
  base: '200ms',
  enter: '320ms',
  /** Snappy ease-out used across carousels / drawers. */
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeSoft: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const motionTransition = (
  props: string[],
  duration: keyof typeof MOTION = 'base',
): string => props.map((p) => `${p} ${MOTION[duration]} ${MOTION.ease}`).join(', ');

/** Dialog / drawer enter-exit timings (MUI `transitionDuration`). */
export const MOTION_DIALOG_MS = { enter: 220, exit: 160 } as const;
