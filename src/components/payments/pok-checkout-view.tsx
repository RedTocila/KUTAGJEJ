'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  GlobalStyles,
  Stack,
  Typography,
} from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { LockSimple as LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { GuestCheckoutForm } from '@nebula-ltd/pok-payments-js/react';
import type { PaymentErrorResponse } from '@nebula-ltd/pok-payments-js';

import '@nebula-ltd/pok-payments-js/style.css';

import { CheckoutSkeleton } from '@/components/core/content-skeletons';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import type { CreatedOrder, Payment } from '@/types/payment';
import { verifyPayment } from '@/lib/payments-client';
import { useUser } from '@/hooks/use-user';

type Phase = 'idle' | 'creating' | 'ready' | 'verifying' | 'done' | 'error';

const EMPTY_POK_FORM_STATE = {
  cardNumber: '',
  email: '',
  expiration: '',
  securityCode: '',
  holdersName: '',
  countryCode: '',
  address1: '',
  locality: '',
  administrativeArea: '',
  postalCode: '',
  phoneNumber: '',
} as const;

const POK_LIGHT = {
  surface: '#ffffff',
  surfaceSoft: '#f2f6ec',
  text: '#141a11',
  textMuted: '#324029',
  textSubtle: '#567044',
  border: '#a3bc8f',
  borderStrong: '#7a9868',
  primary: '#5f9816',
  primaryHover: '#82c91e',
  primaryActive: '#2b540a',
  primaryTint: 'rgba(95, 152, 22, 0.1)',
  primaryRing: 'rgba(95, 152, 22, 0.28)',
} as const;

const POK_DARK = {
  surface: '#262626',
  surfaceSoft: '#171717',
  text: '#fafafa',
  textMuted: '#d4d4d4',
  textSubtle: '#a3a3a3',
  border: '#404040',
  borderStrong: '#525252',
  primary: '#82c91e',
  primaryHover: '#a6e22e',
  primaryActive: '#76ba1b',
  primaryTint: 'rgba(130, 201, 30, 0.12)',
  primaryRing: 'rgba(130, 201, 30, 0.28)',
} as const;

function PokFormThemeStyles({ dark, hideEmail }: { dark: boolean; hideEmail: boolean }) {
  const t = dark ? POK_DARK : POK_LIGHT;
  return (
    <GlobalStyles
      styles={{
        '#pok-payment-container': {
          minHeight: 'auto',
          colorScheme: dark ? 'dark' : 'light',
          color: t.text,
          '--pok-surface': t.surface,
          '--pok-surface-soft': t.surfaceSoft,
          '--pok-text': t.text,
          '--pok-text-muted': t.textMuted,
          '--pok-text-subtle': t.textSubtle,
          '--pok-border': t.border,
          '--pok-border-strong': t.borderStrong,
          '--pok-primary': t.primary,
          '--pok-primary-hover': t.primaryHover,
          '--pok-primary-active': t.primaryActive,
          '--pok-primary-tint': t.primaryTint,
          '--pok-primary-tint-strong': t.primaryTint,
          '--pok-primary-ring': t.primaryRing,
          '--pok-radius': '12px',
        },
        ...(hideEmail
          ? {
              /* Email is taken from the signed-in account — hide the guest field. */
              '.pok-checkout-known-email #pok-payment-container .pok-payment-relative:has(input[placeholder="johndoe@example.com"])':
                {
                  display: 'none !important',
                },
            }
          : null),
        '#pok-payment-container .pok-payment-form': {
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          margin: 0,
          maxWidth: 'none',
          width: '100%',
          background: 'transparent',
          gap: '1rem',
        },
        '#pok-payment-container .pok-payment-label': {
          color: `${t.textMuted} !important`,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        '#pok-payment-container .pok-payment-input-wrap': {
          position: 'relative',
          display: 'block',
          width: '100%',
        },
        '#pok-payment-container .pok-payment-input, #pok-payment-container .pok-payment-modal-trigger': {
          display: 'block',
          width: '100% !important',
          height: '2.75rem',
          boxSizing: 'border-box',
          background: `${t.surfaceSoft} !important`,
          color: `${t.text} !important`,
          border: `1px solid ${t.border} !important`,
          borderRadius: '12px !important',
          boxShadow: 'none !important',
          paddingLeft: '0.875rem',
          paddingRight: '2.75rem',
        },
        '#pok-payment-container .pok-payment-input::placeholder, #pok-payment-container .pok-payment-modal-trigger-empty':
          {
            color: `${t.textSubtle} !important`,
          },
        '#pok-payment-container .pok-payment-input:focus, #pok-payment-container .pok-payment-modal-trigger:focus':
          {
            borderColor: `${t.primary} !important`,
            boxShadow: `0 0 0 3px ${t.primaryRing} !important`,
            outline: 'none',
          },
        '#pok-payment-container .pok-payment-input-icon, #pok-payment-container .pok-payment-clear': {
          position: 'absolute !important',
          top: '1px !important',
          bottom: '1px !important',
          right: '1px !important',
          width: '2.75rem !important',
          border: 'none !important',
          background: 'transparent !important',
          boxShadow: 'none !important',
          color: `${t.textSubtle} !important`,
          display: 'flex !important',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '0 11px 11px 0',
        },
        '#pok-payment-container .pok-payment-checkbox-container label': {
          color: `${t.textMuted} !important`,
        },
        '#pok-payment-container .pok-payment-checkbox-container input[type="checkbox"]': {
          background: `${t.surfaceSoft} !important`,
          borderColor: `${t.borderStrong} !important`,
        },
        '#pok-payment-container .pok-payment-checkbox-container input[type="checkbox"]:checked': {
          background: `${t.primary} !important`,
          borderColor: `${t.primary} !important`,
        },
        '#pok-payment-container .pok-payment-button': {
          background: `${t.primary} !important`,
          color: '#0a0a0a !important',
          width: '100%',
          border: 'none',
          borderRadius: '12px !important',
          fontWeight: 700,
          minHeight: '2.85rem',
          marginTop: '0.35rem',
          boxShadow: 'none !important',
        },
        '#pok-payment-container .pok-payment-button:hover:not(:disabled)': {
          background: `${t.primaryHover} !important`,
        },
        '#pok-payment-container .pok-payment-options': {
          background: `${t.surface} !important`,
          color: `${t.text} !important`,
          border: `1px solid ${t.border} !important`,
          borderRadius: '12px',
          zIndex: 20,
        },
        '#pok-payment-container .pok-payment-option': {
          color: `${t.text} !important`,
          borderRadius: '8px',
        },
        '#pok-payment-container .pok-payment-option:hover, #pok-payment-container .pok-payment-option-active': {
          background: `${t.primaryTint} !important`,
        },
        '#pok-payment-container .pok-payment-option-selected': {
          background: `${t.primary} !important`,
          color: '#0a0a0a !important',
        },
        /* Country modal portals to body — keep brand tokens there too. */
        '.pok-payment-modal-backdrop': {
          '--pok-primary': t.primary,
          '--pok-primary-hover': t.primaryHover,
          '--pok-primary-tint': t.primaryTint,
          '--pok-primary-ring': t.primaryRing,
          '--pok-surface': t.surface,
          '--pok-surface-soft': t.surfaceSoft,
          '--pok-text': t.text,
          '--pok-text-muted': t.textMuted,
          '--pok-text-subtle': t.textSubtle,
          '--pok-border': t.border,
          '--pok-border-strong': t.borderStrong,
          colorScheme: dark ? 'dark' : 'light',
        },
      }}
    />
  );
}

export interface PokCheckoutViewProps {
  title: string;
  /** Short summary of what is being purchased (rendered in the order card). */
  summary?: React.ReactNode;
  /** Creates the POK order on the backend. Called once on mount. */
  createOrder: () => Promise<{ order?: CreatedOrder; error?: string }>;
  /** Fires after the backend confirms the payment was captured. */
  onPaid?: (payment?: Payment) => void;
  /** Leave checkout (cancel / after success). */
  onDone: () => void;
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

/** Full-page checkout sheet aligned with user dashboard packages UI. */
export function PokCheckoutView({ title, summary, createOrder, onPaid, onDone }: PokCheckoutViewProps) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const { user, isLoading: userLoading } = useUser();
  const payerEmail = typeof user?.email === 'string' ? user.email.trim() : '';
  const hideEmail = Boolean(payerEmail);

  const [phase, setPhase] = React.useState<Phase>('idle');
  const [order, setOrder] = React.useState<CreatedOrder | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const startedRef = React.useRef(false);

  React.useEffect(() => {
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
  }, []);

  const handleSuccess = React.useCallback(async () => {
    if (!order) return;
    setPhase('verifying');
    const { paid, payment, error } = await verifyWithRetry(order.paymentId);
    if (paid) {
      setPhase('done');
      onPaid?.(payment);
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
  const formReady = phase === 'ready' && order && !userLoading;
  const showForm = Boolean(formReady);
  const showCentered =
    phase === 'creating' ||
    phase === 'verifying' ||
    phase === 'done' ||
    (phase === 'error' && !order) ||
    (phase === 'ready' && userLoading);

  const retry = () => {
    startedRef.current = true;
    setPhase('creating');
    setOrder(null);
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
  };

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      <PokFormThemeStyles dark={dark} hideEmail={hideEmail} />

      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            mt: '2px',
            borderRadius: 1.5,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: primaryMainAlpha(0.12),
            color: 'primary.main',
          }}
        >
          <ShieldCheckIcon size={20} weight="duotone" />
        </Box>
        <Stack spacing={0.35} sx={{ minWidth: 0, pt: 0.15 }}>
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}
          >
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
            Pagesë e sigurt me kartë
          </Typography>
        </Stack>
      </Stack>

      {summary ? (
        <Box
          sx={{
            p: { xs: 2, sm: 2.25 },
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: primaryMainAlpha(0.35),
            bgcolor: primaryMainAlpha(0.08),
          }}
        >
          {summary}
        </Box>
      ) : null}

      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
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
                <Button variant="contained" onClick={onDone} sx={{ mt: 1 }}>
                  Kthehu
                </Button>
              </>
            ) : phase === 'error' ? (
              <Stack direction="row" spacing={1.5}>
                <Button variant="outlined" onClick={onDone}>
                  Kthehu
                </Button>
                <Button variant="contained" disabled={busy} onClick={retry}>
                  Provo përsëri
                </Button>
              </Stack>
            ) : (
              <Box sx={{ width: '100%' }}>
                <CheckoutSkeleton />
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1.5 }}>
                  {phase === 'verifying' ? 'Po konfirmohet pagesa...' : 'Po përgatitet pagesa e sigurt...'}
                </Typography>
              </Box>
            )}
          </Stack>
        ) : null}

        {showForm && order ? (
          <Box
            className={hideEmail ? 'pok-checkout-known-email' : undefined}
            sx={{ width: '100%' }}
          >
            <GuestCheckoutForm
              key={`${order.orderId}:${payerEmail}`}
              orderId={order.orderId}
              onSuccess={handleSuccess}
              onError={handleError}
              options={{
                env: order.pokEnv,
                locale: 'al',
                countrySelect: 'dropdown',
                initialState: {
                  ...EMPTY_POK_FORM_STATE,
                  email: payerEmail,
                },
              }}
            />
          </Box>
        ) : null}
      </Box>

      {phase !== 'done' ? (
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', justifyContent: 'center', color: 'text.secondary', pb: 0.5 }}
        >
          <LockSimpleIcon size={15} weight="fill" />
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            Pagesa përpunohet me siguri nga POK Payments
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  );
}
