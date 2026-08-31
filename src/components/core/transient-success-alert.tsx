'use client';

import * as React from 'react';
import { Alert, Box, Slide, type AlertColor, type AlertProps } from '@mui/material';
import { createPortal } from 'react-dom';

const DEFAULT_DURATION_MS = 4000;

export type TransientNotificationProps = Omit<AlertProps, 'children'> & {
  message?: React.ReactNode;
  duration?: number;
  onDismiss?: () => void;
};

export function TransientNotification({
  message,
  duration = DEFAULT_DURATION_MS,
  onDismiss,
  severity = 'success',
  ...props
}: TransientNotificationProps & { severity?: AlertColor }) {
  const [visible, setVisible] = React.useState(Boolean(message));
  const onDismissRef = React.useRef(onDismiss);
  const touchStartY = React.useRef<number | null>(null);

  React.useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  React.useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, duration);
    return () => window.clearTimeout(timeoutId);
  }, [duration, message]);

  if (!message) return null;

  const dismiss = () => setVisible(false);

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
      <Slide
        direction={visible ? 'down' : 'up'}
        in={visible}
        mountOnEnter
        unmountOnExit
        onExited={() => onDismissRef.current?.()}
      >
        <Alert
          {...props}
          severity={severity}
          onClose={(event) => {
            dismiss();
            props.onClose?.(event);
          }}
          onTouchStart={(event) => {
            touchStartY.current = event.changedTouches[0]?.clientY ?? null;
            props.onTouchStart?.(event);
          }}
          onTouchEnd={(event) => {
            const startY = touchStartY.current;
            touchStartY.current = null;
            const endY = event.changedTouches[0]?.clientY;
            if (startY != null && endY != null && startY - endY >= 56) dismiss();
            props.onTouchEnd?.(event);
          }}
          sx={[
            {
              boxShadow: 6,
              cursor: 'pointer',
              touchAction: 'none',
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

export function TransientSuccessAlert(props: Omit<TransientNotificationProps, 'severity'>) {
  return <TransientNotification {...props} severity="success" />;
}
