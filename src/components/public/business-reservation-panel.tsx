'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Collapse,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';

import { ReservationDateField } from '@/components/core/reservation-date-field';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

const FONT_BODY = '0.875rem';
const FONT_CAPTION = '0.75rem';

const surfaceSx = {
  ...productPanelSx,
  p: 2,
} as const;

const reserveFieldSx = {
  ...productFieldSx,
  '& .MuiOutlinedInput-root': {
    ...productFieldSx['& .MuiOutlinedInput-root'],
    fontSize: FONT_BODY,
    fontWeight: 600,
  },
  '& .MuiInputLabel-root': { fontSize: FONT_CAPTION, fontWeight: 600 },
} as const;

export type BusinessReservationPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserveDate: string;
  onReserveDate: (value: string) => void;
  reservePeople: string;
  onReservePeople: (value: string) => void;
  reserveGuestName: string;
  onReserveGuestName: (value: string) => void;
  reserveGuestPhone: string;
  onReserveGuestPhone: (value: string) => void;
  reserveNote: string;
  onReserveNote: (value: string) => void;
  usePlatformReservation: boolean;
  reserveFeedback: string | null;
  reserveSubmitting: boolean;
  onReserve: () => void;
  telHref: string | null;
  panelRef?: React.Ref<HTMLDivElement>;
  bodyFontSize?: string;
  captionFontSize?: string;
};

function BusinessReservationFormFields({
  reserveDate,
  onReserveDate,
  reservePeople,
  onReservePeople,
  reserveGuestName,
  onReserveGuestName,
  reserveGuestPhone,
  onReserveGuestPhone,
  reserveNote,
  onReserveNote,
  usePlatformReservation,
  reserveFeedback,
  reserveSubmitting,
  onReserve,
  telHref,
  bodyFontSize = FONT_BODY,
  captionFontSize = FONT_CAPTION,
}: Omit<BusinessReservationPanelProps, 'open' | 'onOpenChange' | 'panelRef'>) {
  return (
    <Stack spacing={1.5}>
      {usePlatformReservation ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: captionFontSize, mb: 0.25, lineHeight: 1.45 }}
        >
          Plotësoni fushat — kërkesa dërgohet si mesazh te biznesi.
        </Typography>
      ) : null}
      <ReservationDateField
        size="small"
        label="Data"
        value={reserveDate}
        onChange={onReserveDate}
        emptyLabel="Zgjidhni datën…"
        sx={reserveFieldSx}
      />
      <TextField
        size="small"
        label="Numri i mysafirëve"
        type="number"
        value={reservePeople}
        onChange={(e) => onReservePeople(e.target.value)}
        slotProps={{ htmlInput: { min: 1, max: 50, inputMode: 'numeric' } }}
        fullWidth
        sx={reserveFieldSx}
      />
      {usePlatformReservation ? (
        <Stack spacing={1.25}>
          <TextField
            size="small"
            label="Emri i plotë"
            value={reserveGuestName}
            onChange={(e) => onReserveGuestName(e.target.value)}
            fullWidth
            sx={reserveFieldSx}
          />
          <TextField
            size="small"
            label="Telefoni"
            value={reserveGuestPhone}
            onChange={(e) => onReserveGuestPhone(e.target.value)}
            fullWidth
            sx={reserveFieldSx}
          />
          <TextField
            size="small"
            label="Shënim (opsionale)"
            value={reserveNote}
            onChange={(e) => onReserveNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            placeholder="p.sh. Tavolinë pranë dritares…"
            sx={reserveFieldSx}
          />
        </Stack>
      ) : null}
      {reserveFeedback ? (
        <Alert
          severity={reserveFeedback.includes('dërgua') ? 'success' : 'warning'}
          sx={{ py: 0.5, borderRadius: 2, alignItems: 'center' }}
        >
          {reserveFeedback}
        </Alert>
      ) : null}
      <Button
        variant="contained"
        fullWidth
        onClick={onReserve}
        disabled={usePlatformReservation ? reserveSubmitting : !telHref}
        startIcon={usePlatformReservation ? <ChatsCircleIcon size={18} weight="bold" /> : undefined}
        sx={{
          ...productButtonSx,
          py: 1.35,
          fontSize: bodyFontSize,
          mt: 0.25,
        }}
      >
        {reserveSubmitting
          ? 'Duke dërguar…'
          : usePlatformReservation
            ? 'Dërgo rezervimin'
            : 'Rezervo tani'}
      </Button>
    </Stack>
  );
}

export function BusinessReservationPanel({
  open,
  onOpenChange,
  panelRef,
  bodyFontSize,
  captionFontSize,
  ...formProps
}: BusinessReservationPanelProps) {
  return (
    <Box
      ref={panelRef}
      sx={{
        ...surfaceSx,
        p: 0,
        overflow: 'hidden',
      }}
    >
      <ButtonBase
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          px: 2,
          py: 1.5,
          textAlign: 'left',
          bgcolor: open ? 'transparent' : 'primary.main',
          color: open ? 'text.primary' : 'primary.contrastText',
          transition: 'background-color 0.15s ease, color 0.15s ease',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <CalendarBlankIcon
            size={22}
            weight={open ? 'regular' : 'fill'}
            color={open ? 'var(--mui-palette-primary-main)' : 'currentColor'}
          />
          <Stack spacing={0.15} sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: bodyFontSize ?? FONT_BODY, lineHeight: 1.25 }}>
              Rezervo tavolinën
            </Typography>
            {!open && formProps.usePlatformReservation ? (
              <Typography sx={{ fontSize: captionFontSize ?? FONT_CAPTION, opacity: 0.75, lineHeight: 1.3 }}>
                Hap formularin e rezervimit
              </Typography>
            ) : null}
          </Stack>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          <CaretDownIcon size={18} weight="bold" />
        </Box>
      </ButtonBase>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
          <BusinessReservationFormFields
            {...formProps}
            bodyFontSize={bodyFontSize}
            captionFontSize={captionFontSize}
          />
        </Box>
      </Collapse>
    </Box>
  );
}
