'use client';

import * as React from 'react';

import { sheetDragHandleSx, useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss';
import { MOTION_DIALOG_MS } from '@/styles/motion';

/**
 * Swipe-down dismiss for MUI bottom sheets (handle + pull when scrolled to top).
 */
export function useBottomSheetDismiss(onClose: () => void, open: boolean) {
  const [instantExit, setInstantExit] = React.useState(false);

  React.useEffect(() => {
    if (open) setInstantExit(false);
  }, [open]);

  const dismiss = useSwipeToDismiss({
    enabled: open,
    requireScrollTop: true,
    onDismiss: () => {
      setInstantExit(true);
      onClose();
    },
  });

  return {
    ...dismiss,
    handleSx: sheetDragHandleSx(true),
    drawerProps: {
      transitionDuration: instantExit ? (0 as const) : MOTION_DIALOG_MS,
    },
    paperSlotProps: {
      ref: dismiss.paperRef,
      ...dismiss.paperBind,
    },
  };
}
