'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  GlobalStyles,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { LockSimple as LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { GuestCheckoutForm } from '@nebula-ltd/pok-payments-js/react';
import type { PaymentErrorResponse } from '@nebula-ltd/pok-payments-js';

import '@nebula-ltd/pok-payments-js/lib/index.css';

import type { CreatedOrder, Payment } from '@/types/payment';
import { verifyPayment } from '@/lib/payments-client';

type Phase = 'idle' | 'creating' | 'ready' | 'verifying' | 'done' | 'error';

const BRAND_GRADIENT = 'linear-gradient(135deg, #0a6d9c 0%, #04557c 55%, #033f5c 100%)';

/**
 * Neutralize POK's own card chrome so the form sits flush on our payment sheet
 * instead of looking like a box inside a box. Scoped to #pok-payment-container.
 */
const pokFormOverrides = (
  <GlobalStyles
    styles={{
      '#pok-payment-container': { minHeight: 'auto' },
      '#pok-payment-container .pok-payment-form': {
        border: 'none',
        boxShadow: 'none',
        padding: 0,
        margin: 0,
        maxWidth: 'none',
        background: 'transparent',
        gap: '0.9rem',
      },
    }}
  />
);

export interface PokCheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Short summary of what is being purchased (rendered in the order card). */
  summary?: React.ReactNode;
  /** Creates the POK order on the backend. Called once when the dialog opens. */
  createOrder: () => Promise<{ order?: CreatedOrder; error?: string }>;
  /** Fires after the backend confirms the payment was captured. */
  onPaid: (payment?: Payment) => void;
}

async function verifyWithRetry(paymentId: string): Promise<{ paid: boolean; payment?: Payment; error?: string }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { paid, payment, error } = await verifyPayment(paymentId);
    if (paid) return { paid: true, payment };
    if (error && attempt === 2) return { paid: false, error };
    await new Promise((r) => setTimeout(r, 1500));
  }
  return { paid: false };
}

export function PokCheckoutDialog({
  open,
  onClose,
  title,
  summary,
  createOrder,
  onPaid,
}: PokCheckoutDialogProps) {
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [order, setOrder] = React.useState<CreatedOrder | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const startedRef = React.useRef(false);

  const reset = React.useCallback(() => {
    setPhase('idle');
    setOrder(null);
    setErrorMsg(null);
    startedRef.current = false;
  }, []);

  React.useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase('creating');
    setErrorMsg(null);
    void (async () => {
      const { order: created, error } = await createOrder();
      if (error || !created) {
        setErrorMsg(error || 'Nuk u krijua dot pagesa.');
        setPhase('error');
        return;
      }
      setOrder(created);
      setPhase('ready');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const handleSuccess = React.useCallback(async () => {
    if (!order) return;
    setPhase('verifying');
    const { paid, payment, error } = await verifyWithRetry(order.paymentId);
    if (paid) {
      setPhase('done');
      onPaid(payment);
    } else {
      setErrorMsg(
        error ||
          'Pagesa u dërgua, por nuk u konfirmua ende. Kontrolloni "Pagesat e mia" pas pak minutash.',
      );
      setPhase('error');
    }
  }, [order, onPaid]);

  const handleError = React.useCallback((err: PaymentErrorResponse) => {
    console.error('POK payment error:', err);
    setErrorMsg('Pagesa dështoi. Kontrolloni të dhënat e kartës dhe provoni përsëri.');
  }, []);

  const busy = phase === 'verifying';
  const closeUnlessBusy = () => {
    if (busy) return;
    onClose();
  };

  const showForm = phase === 'ready' && order;
  const showCentered = phase === 'creating' || phase === 'verifying' || phase === 'done' || (phase === 'error' && !order);

  return (
    <Dialog
      open={open}
      onClose={closeUnlessBusy}
      fullWidth
      maxWidth="sm"
      // POK's country/overlay can render outside this dialog; keep it interactive.
      disableEnforceFocus
      disableRestoreFocus
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
    >
      {pokFormOverrides}

      {/* Branded header with a security badge */}
      <Box
        sx={{
          background: BRAND_GRADIENT,
          color: '#fff',
          px: 3,
          py: 2.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(255,255,255,0.18)',
              flexShrink: 0,
            }}
          >
            <ShieldCheckIcon size={22} weight="fill" color="#fff" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>
              {title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Pagesë e sigurt me kartë
            </Typography>
          </Box>
        </Stack>
        <IconButton
          onClick={onClose}
          disabled={busy}
          size="small"
          aria-label="Mbyll"
          sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
        >
          <XIcon size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: { xs: 2.5, sm: 3 }, bgcolor: 'background.default' }}>
        {summary ? (
          <Box
            sx={{
              mb: 2.5,
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            {summary}
          </Box>
        ) : null}

        {errorMsg ? (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
            {errorMsg}
          </Alert>
        ) : null}

        {showCentered ? (
          <Stack spacing={1.5} sx={{ alignItems: 'center', py: 4 }}>
            {phase === 'done' ? (
              <>
                <CheckCircleIcon size={52} weight="fill" color="var(--mui-palette-success-main)" />
                <Typography sx={{ fontWeight: 800 }}>Pagesa u krye me sukses!</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Faleminderit. Përfitimet u aktivizuan në llogarinë tuaj.
                </Typography>
                <Button variant="contained" onClick={onClose} sx={{ mt: 1, borderRadius: 2 }}>
                  Mbyll
                </Button>
              </>
            ) : phase === 'error' ? (
              <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>
                Mbyll
              </Button>
            ) : (
              <>
                <CircularProgress size={30} />
                <Typography variant="body2" color="text.secondary">
                  {phase === 'verifying' ? 'Po konfirmohet pagesa...' : 'Po përgatitet pagesa e sigurt...'}
                </Typography>
              </>
            )}
          </Stack>
        ) : null}

        {/* The POK card form on a clean white payment sheet */}
        {showForm ? (
          <Box
            sx={{
              borderRadius: 2.5,
              bgcolor: '#fff',
              p: { xs: 2, sm: 2.5 },
              border: '1px solid',
              borderColor: 'rgba(15,23,42,0.08)',
              boxShadow: '0 1px 2px rgba(15,23,42,0.05), 0 12px 30px -14px rgba(15,23,42,0.25)',
            }}
          >
            <GuestCheckoutForm
              orderId={order.orderId}
              onSuccess={handleSuccess}
              onError={handleError}
              options={{ env: order.pokEnv, locale: 'al', countrySelect: 'dropdown' }}
            />
          </Box>
        ) : null}

        {/* Secure-payment reassurance footer */}
        {phase !== 'done' ? (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: 'center', justifyContent: 'center', mt: 2.5, color: 'text.secondary' }}
          >
            <LockSimpleIcon size={15} weight="fill" />
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              Pagesa përpunohet me siguri nga POK Payments
            </Typography>
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
