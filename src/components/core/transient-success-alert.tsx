'use client';

import * as React from 'react';
import { Alert, Box, Slide, type AlertProps } from '@mui/material';
import { createPortal } from 'react-dom';

const DEFAULT_DURATION_MS = 4000;

export function TransientSuccessAlert({
  message,
  duration = DEFAULT_DURATION_MS,
  onDismiss,
  ...props
}: Omit<AlertProps, 'children' | 'severity'> & {
  message?: React.ReactNode;
  duration?: number;
  onDismiss?: () => void;
}) {
  const [visible, setVisible] = React.useState(Boolean(message));
  const onDismissRef = React.useRef(onDismiss);
  const touchStartX = React.useRef<number | null>(null);

  React.useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  React.useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setVisible(false);
      onDismissRef.current?.();
    }, duration);
    return () => window.clearTimeout(timeoutId);
  }, [duration, message]);

  if (!message || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    onDismissRef.current?.();
  };

  const alert = (
    <Box
      sx={{
        position: 'fixed',
        top: 'max(12px, env(safe-area-inset-top))',
        left: { xs: 12, sm: '50%' },
        right: { xs: 12, sm: 'auto' },
        zIndex: (theme) => theme.zIndex.snackbar,
        width: { xs: 'auto', sm: 'min(560px, calc(100vw - 32px))' },
        maxWidth: 'calc(100vw - 24px)',
        transform: { sm: 'translateX(-50%)' },
        pointerEvents: 'none',
      }}
    >
      <Slide direction="down" in={visible} mountOnEnter unmountOnExit>
        <Alert
          {...props}
          severity="success"
          onClose={(event) => {
            dismiss();
            props.onClose?.(event);
          }}
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const startX = touchStartX.current;
            touchStartX.current = null;
            const endX = event.changedTouches[0]?.clientX;
            if (startX != null && endX != null && Math.abs(endX - startX) >= 56) dismiss();
          }}
          sx={[
            {
              boxShadow: 6,
              cursor: 'pointer',
              touchAction: 'pan-y',
              pointerEvents: 'auto',
            },
            ...(Array.isArray(props.sx) ? props.sx : props.sx ? [props.sx] : []),
          ]}
        >
          {message}
        </Alert>
      </Slide>
    </Box>
  );

  return typeof document === 'undefined' ? null : createPortal(alert, document.body);
}
