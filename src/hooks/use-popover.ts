import * as React from 'react';

interface PopoverController<T> {
  anchorRef: React.MutableRefObject<T | null>;
  /** Popover anchor; set when opening so refs are not read during render. */
  anchorEl: T | null;
  handleOpen: () => void;
  handleClose: () => void;
  handleToggle: () => void;
  open: boolean;
}

export function usePopover<T = HTMLElement>(): PopoverController<T> {
  const anchorRef = React.useRef<T>(null);
  const [anchorEl, setAnchorEl] = React.useState<T | null>(null);
  const [open, setOpen] = React.useState<boolean>(false);

  const handleOpen = React.useCallback(() => {
    setAnchorEl(anchorRef.current);
    setOpen(true);
  }, []);

  const handleClose = React.useCallback(() => {
    setOpen(false);
  }, []);

  const handleToggle = React.useCallback(() => {
    setAnchorEl(anchorRef.current);
    setOpen((prevState) => !prevState);
  }, []);

  return { anchorEl, anchorRef, handleClose, handleOpen, handleToggle, open };
}
