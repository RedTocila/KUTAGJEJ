'use client';

import * as React from 'react';
import type { TransitionProps } from '@mui/material/transitions';
import { useForkRef } from '@mui/material/utils';
import { Transition, type TransitionStatus } from 'react-transition-group';

import { MOTION, MOTION_DIALOG_MS, MOTION_POPOVER_MS } from '@/styles/motion';

type PopChild = React.ReactElement<{ style?: React.CSSProperties; ref?: React.Ref<HTMLElement> }>;

type PopTransitionProps = Omit<TransitionProps, 'children'> & { children: PopChild };

type PopConfig = {
  /** Scale while hidden (1 = no zoom). */
  scale: number;
  /** Vertical offset in px while hidden. */
  offsetY: number;
  duration: { enter: number; exit: number };
  displayName: string;
};

function resolveTimeout(
  timeout: TransitionProps['timeout'] | 'auto' | undefined,
  fallback: { enter: number; exit: number },
): { enter: number; exit: number } {
  if (typeof timeout === 'number') return { enter: timeout, exit: timeout };
  if (timeout && typeof timeout === 'object') {
    return { enter: timeout.enter ?? fallback.enter, exit: timeout.exit ?? fallback.exit };
  }
  return fallback;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function createPopTransition({ scale, offsetY, duration, displayName }: PopConfig) {
  const hiddenTransform = `translate3d(0, ${offsetY}px, 0) scale(${scale})`;

  const stateStyles: Record<TransitionStatus, React.CSSProperties> = {
    entering: { opacity: 1, transform: 'none' },
    entered: { opacity: 1, transform: 'none' },
    exiting: { opacity: 0, transform: hiddenTransform },
    exited: { opacity: 0, transform: hiddenTransform },
    unmounted: {},
  };

  const PopTransition = React.forwardRef<HTMLElement, PopTransitionProps>(function PopTransition(props, ref) {
    const {
      addEndListener,
      appear = true,
      children,
      easing: _easing,
      in: inProp,
      onEnter,
      onEntered,
      onEntering,
      onExit,
      onExited,
      onExiting,
      style,
      timeout,
      ...other
    } = props;
    const nodeRef = React.useRef<HTMLElement | null>(null);
    const handleRef = useForkRef(nodeRef, children.props.ref, ref);
    const ms = resolveTimeout(timeout as TransitionProps['timeout'] | 'auto', duration);

    const withNode =
      <A extends unknown[]>(callback?: (node: HTMLElement, ...args: A) => void) =>
      (...args: A) => {
        if (callback && nodeRef.current) callback(nodeRef.current, ...args);
      };

    const setTransition = (node: HTMLElement, mode: 'enter' | 'exit') => {
      const length = prefersReducedMotion() ? 0 : ms[mode];
      node.style.transition =
        mode === 'enter'
          ? `opacity ${Math.round(length * 0.6)}ms ${MOTION.ease}, transform ${length}ms ${MOTION.easeIos}`
          : `opacity ${length}ms ${MOTION.easeExit}, transform ${length}ms ${MOTION.easeExit}`;
    };

    return (
      <Transition
        appear={appear}
        in={inProp}
        nodeRef={nodeRef}
        timeout={prefersReducedMotion() ? 0 : ms}
        onEnter={withNode((node: HTMLElement, isAppearing: boolean) => {
          // Commit the hidden frame so the enter always animates from the start.
          void node.offsetHeight;
          setTransition(node, 'enter');
          onEnter?.(node, isAppearing);
        })}
        onEntering={withNode(onEntering)}
        onEntered={withNode(onEntered)}
        onExit={withNode((node: HTMLElement) => {
          setTransition(node, 'exit');
          onExit?.(node);
        })}
        onExiting={withNode(onExiting)}
        onExited={withNode((node: HTMLElement) => {
          node.style.transition = '';
          onExited?.(node);
        })}
        addEndListener={(done) => {
          if (addEndListener && nodeRef.current) addEndListener(nodeRef.current, done);
        }}
        {...other}
      >
        {(state: TransitionStatus, childProps?: Record<string, unknown>) => {
          const { ownerState: _ownerState, ...restChildProps } = childProps ?? {};
          return React.cloneElement(children, {
            ...restChildProps,
            ref: handleRef,
            style: {
              ...stateStyles[state],
              ...(state === 'exited' && !inProp ? { visibility: 'hidden' } : null),
              willChange: state === 'entered' ? undefined : 'opacity, transform',
              ...style,
              ...children.props.style,
            },
          });
        }}
      </Transition>
    );
  });
  PopTransition.displayName = displayName;
  return PopTransition;
}

/** Dialogs: lift + zoom in, quick fall-away on close. */
export const DialogPopTransition = createPopTransition({
  scale: 0.94,
  offsetY: 12,
  duration: MOTION_DIALOG_MS,
  displayName: 'DialogPopTransition',
});

/** Menus / popovers: grow from the anchor (Popover sets `transform-origin`). */
export const MenuPopTransition = createPopTransition({
  scale: 0.9,
  offsetY: 0,
  duration: MOTION_POPOVER_MS,
  displayName: 'MenuPopTransition',
});
