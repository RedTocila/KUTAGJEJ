'use client';

import * as React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { CrownSimple as CrownSimpleIcon } from '@phosphor-icons/react/dist/ssr/CrownSimple';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import type { ListingMetricKind } from '@/lib/listing-metrics';
import {
  applyPremiumFromPlan,
  applyPremiumVoucher,
  buyPremiumWithCredits,
  fetchPremiumPlanQuota,
} from '@/lib/payments-client';
import { california } from '@/styles/theme/colors';
import { productButtonSx } from '@/styles/product-sx';
import { paths } from '@/paths';

/** Entry buy package — matches Grow/Elite plan Premium duration (30 days). */
export const PREMIUM_PACKAGE_ID = 'premium-30';
export const PREMIUM_PRICE_EUR = 27;
export const PREMIUM_PRICE_BC = 300;
export const PREMIUM_DAYS = 30;

export const PREMIUM_AMBER = california[400];
export const PREMIUM_AMBER_DARK = california[500];
export const PREMIUM_AMBER_SOFT = 'rgba(255, 187, 31, 0.18)';
export const PREMIUM_AMBER_ON = '#000000';

export type PremiumPayMode = 'plan' | 'buy-bc' | 'buy-card';

const submitBtnSx = {
  ...productButtonSx,
  px: 3,
  minHeight: 48,
  width: '100%',
  flex: 1,
} as const;

/**
 * Premium create flow footer.
 * Uses a Grow/Elite package slot when available; otherwise card / Boost Coins.
 */
export function PremiumPostActions({
  submitting = false,
  disabled = false,
  onPost,
}: {
  submitting?: boolean;
  disabled?: boolean;
  onPost: (mode: PremiumPayMode) => void;
}) {
  const t = useCopy();
  const { user } = useUser();
  const balance = Number(user?.boostCredits) || 0;
  const canBc = balance >= PREMIUM_PRICE_BC;
  const [planRemaining, setPlanRemaining] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const quota = await fetchPremiumPlanQuota();
      if (cancelled) return;
      setPlanRemaining(quota.quota?.remaining ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasPlanSlot = (planRemaining ?? 0) > 0;
  const quotaLoaded = planRemaining !== null;

  return (
    <Stack spacing={1.25} sx={{ pt: 0.5 }}>
      <Box
        sx={{
          p: 1.75,
          borderRadius: 2,
          border: '1px solid',
          borderColor: PREMIUM_AMBER,
          bgcolor: PREMIUM_AMBER_SOFT,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
          <CrownSimpleIcon size={18} weight="regular" color={PREMIUM_AMBER} />
          <Typography sx={{ fontWeight: 800, color: PREMIUM_AMBER, fontSize: '0.95rem' }}>
            {t.packages.premiumDaysTitle(PREMIUM_DAYS)}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
          {hasPlanSlot
            ? t.packages.premiumWithPlan(planRemaining ?? 0, PREMIUM_DAYS)
            : t.packages.premiumWithoutPlan(PREMIUM_DAYS)}
        </Typography>
      </Box>

      {!quotaLoaded ? (
        <Button
          type="button"
          variant="contained"
          disabled
          sx={{
            ...submitBtnSx,
            bgcolor: PREMIUM_AMBER,
            color: PREMIUM_AMBER_ON,
            '&.Mui-disabled': { bgcolor: PREMIUM_AMBER, color: PREMIUM_AMBER_ON, opacity: 0.55 },
          }}
        >
          {t.packages.loadingEllipsis}
        </Button>
      ) : hasPlanSlot ? (
        <Button
          type="button"
          variant="contained"
          disabled={disabled || submitting}
          onClick={() => onPost('plan')}
          startIcon={<CrownSimpleIcon size={18} weight="regular" />}
          sx={{
            ...submitBtnSx,
            bgcolor: PREMIUM_AMBER,
            color: PREMIUM_AMBER_ON,
            '&:hover': { bgcolor: PREMIUM_AMBER_DARK, boxShadow: 'none' },
            '&.Mui-disabled': { bgcolor: PREMIUM_AMBER, color: PREMIUM_AMBER_ON, opacity: 0.55 },
          }}
        >
          {submitting ? t.packages.posting : t.packages.post}
        </Button>
      ) : (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <Button
            type="button"
            variant="contained"
            disabled={disabled || submitting}
            onClick={() => onPost('buy-card')}
            startIcon={<CreditCardIcon size={18} weight="bold" />}
            sx={{
              ...submitBtnSx,
              bgcolor: PREMIUM_AMBER,
              color: PREMIUM_AMBER_ON,
              '&:hover': { bgcolor: PREMIUM_AMBER_DARK, boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: PREMIUM_AMBER, color: PREMIUM_AMBER_ON, opacity: 0.55 },
            }}
          >
            {submitting ? t.packages.posting : `${t.packages.post} · ${PREMIUM_PRICE_EUR}€`}
          </Button>
          <Button
            type="button"
            variant="outlined"
            disabled={disabled || submitting || !canBc}
            onClick={() => onPost('buy-bc')}
            startIcon={<BoostCoinIcon size={18} />}
            sx={{
              ...submitBtnSx,
              borderColor: PREMIUM_AMBER,
              color: PREMIUM_AMBER,
              '&:hover': { borderColor: PREMIUM_AMBER_DARK, bgcolor: PREMIUM_AMBER_SOFT, boxShadow: 'none' },
              '&.Mui-disabled': { borderColor: PREMIUM_AMBER, color: PREMIUM_AMBER, opacity: 0.45 },
            }}
          >
            {submitting
              ? t.packages.posting
              : canBc
                ? `${t.packages.post} · ${PREMIUM_PRICE_BC} BC`
                : `${PREMIUM_PRICE_BC} BC ${t.packages.insufficientBc}`}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

export async function activatePremiumAfterCreate(params: {
  mode: PremiumPayMode;
  kind: ListingMetricKind;
  listingId: string;
  packageId?: string;
}): Promise<{ ok: boolean; message?: string; premiumUntil?: string; redirectToCheckout?: string }> {
  const { mode, kind, listingId } = params;
  const packageId = String(params.packageId || PREMIUM_PACKAGE_ID).trim() || PREMIUM_PACKAGE_ID;

  if (mode === 'buy-card') {
    const q = new URLSearchParams({
      kind: 'premium',
      packageId,
      returnTo: `${paths.user.packagesExtra}?assignPremium=1`,
    });
    return { ok: true, redirectToCheckout: `${paths.user.checkout}?${q.toString()}` };
  }

  if (mode === 'plan') {
    const res = await applyPremiumFromPlan({ kind, listingId });
    if (res.error || !res.premiumUntil) {
      return { ok: false, message: res.error || 'Aplikimi i Premium dështoi.' };
    }
    return { ok: true, premiumUntil: res.premiumUntil, message: res.message };
  }

  if (mode === 'buy-bc') {
    const bought = await buyPremiumWithCredits(packageId);
    if (bought.error || !bought.voucher) {
      return { ok: false, message: bought.error || 'Blerja me BC dështoi.' };
    }
    const res = await applyPremiumVoucher({
      voucherId: bought.voucher.id,
      kind,
      listingId,
    });
    if (res.error || !res.premiumUntil) {
      return { ok: false, message: res.error || 'Aplikimi i Premium dështoi.' };
    }
    return { ok: true, premiumUntil: res.premiumUntil, message: res.message };
  }

  return { ok: true };
}
