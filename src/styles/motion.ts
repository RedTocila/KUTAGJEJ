export const MOTION = {
  /** Press-in should feel instant; release can ease back. */
  press: '0ms',
  release: '140ms',
  fast: '120ms',
  base: '180ms',
  enter: '240ms',
  /** Snappy ease-out used across carousels / drawers. */
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeSoft: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** iOS sheet / navigation-stack curve — fast start, long settle. */
  easeIos: 'cubic-bezier(0.32, 0.72, 0, 1)',
  /** Accelerating exit for things leaving the screen. */
  easeExit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

type MotionDurationKey = 'press' | 'release' | 'fast' | 'base' | 'enter';

export const motionTransition = (
  props: string[],
  duration: MotionDurationKey = 'base',
): string => props.map((p) => `${p} ${MOTION[duration]} ${MOTION.ease}`).join(', ');

/**
 * Instant press-in / eased release — use on buttons, chips, icon buttons.
 * Without the `:active { transitionDuration: 0 }` trick, a 120ms ease to the
 * pressed scale feels like lag on tap.
 */
export const PRESS_FEEDBACK = {
  transition: `background-color ${MOTION.fast} ${MOTION.ease}, color ${MOTION.fast} ${MOTION.ease}, border-color ${MOTION.fast} ${MOTION.ease}, box-shadow ${MOTION.fast} ${MOTION.ease}, opacity ${MOTION.fast} ${MOTION.ease}, transform ${MOTION.release} ${MOTION.ease}`,
  '&:active': {
    transitionDuration: MOTION.press,
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:active': { transform: 'none', transitionDuration: undefined },
  },
} as const;

/** Dialog enter-exit timings (MUI `transitionDuration`). */
export const MOTION_DIALOG_MS = { enter: 300, exit: 200 } as const;

/** Bottom / side sheets — a touch longer so the slide reads as physical. */
export const MOTION_SHEET_MS = { enter: 380, exit: 260 } as const;

/** Menus / popovers growing from their anchor. */
export const MOTION_POPOVER_MS = { enter: 240, exit: 160 } as const;

/** Mobile push / pop between routes (keep in sync with `--kg-nav-push` in global.css). */
export const NAV_PUSH_MS = 380;

/** Desktop route crossfade. */
export const MOTION_NAV_FADE_MS = 220;
