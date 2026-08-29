'use client';

import * as React from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import type { ListingMetricKind } from '@/lib/listing-metrics';
import {
  OKAZION_ACCENT,
  OKAZION_ACCENT_SOFT,
  OKAZION_RED,
  OKAZION_RED_DARK,
  OKAZION_RED_ON,
  OKAZION_RED_SOFT,
} from '@/lib/home-categories';
import {
  applyOkazionFromPlan,
  applyOkazionVoucher,
  buyOkazionWithCredits,
  fetchOkazionPlanQuota,
  listOkazionVouchers,
} from '@/lib/payments-client';
import { productButtonSx } from '@/styles/product-sx';
import { paths } from '@/paths';

export const OKAZION_PACKAGE_ID = 'okazion-5';
export const OKAZION_PRICE_EUR = 19;
export const OKAZION_PRICE_BC = 250;

export type OkazionBoostMode = 'off' | 'plan' | 'voucher' | 'buy-bc' | 'buy-card';
export type OkazionPayMode = 'plan' | 'buy-bc' | 'buy-card';

const submitBtnSx = {
  ...productButtonSx,
  px: 3,
  minHeight: 48,
  width: '100%',
  flex: 1,
  borderRadius: 999,
} as const;

/**
 * Optional OKAZION upsell while creating a normal listing (not from OKAZION picker).
 */
export function OkazionBoostUpsell({
  value,
  onChange,
}: {
  value: OkazionBoostMode;
  onChange: (mode: OkazionBoostMode) => void;
}) {
  const t = useCopy();
  const { user } = useUser();
  const balance = Number(user?.boostCredits) || 0;
  const [planRemaining, setPlanRemaining] = React.useState(0);
  const [unusedCount, setUnusedCount] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [quota, vouchers] = await Promise.all([
        fetchOkazionPlanQuota(),
        listOkazionVouchers(true),
      ]);
      if (cancelled) return;
      setPlanRemaining(quota.quota?.remaining ?? 0);
      setUnusedCount((vouchers.vouchers ?? []).filter((v) => v.status === 'unused').length);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '2px solid',
        borderColor: OKAZION_ACCENT,
        bgcolor: OKAZION_ACCENT_SOFT,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <SealPercentIcon size={22} weight="regular" color={OKAZION_ACCENT} />
        <Typography sx={{ fontWeight: 800, color: OKAZION_ACCENT }}>{t.packages.okazion7Days}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
        {t.packages.okazionUpsellBody(OKAZION_PRICE_EUR, OKAZION_PRICE_BC)}
      </Typography>

      <RadioGroup value={value} onChange={(e) => onChange(e.target.value as OkazionBoostMode)}>
        <FormControlLabel value="off" control={<Radio color="error" size="small" sx={{ color: OKAZION_ACCENT, '&.Mui-checked': { color: OKAZION_ACCENT } }} />} label={t.packages.notNow} />
        {planRemaining > 0 ? (
          <FormControlLabel
            value="plan"
            control={<Radio size="small" sx={{ color: OKAZION_ACCENT, '&.Mui-checked': { color: OKAZION_ACCENT } }} />}
            label={`${t.packages.usePlanSlot} (${planRemaining})`}
          />
        ) : null}
        {unusedCount > 0 ? (
          <FormControlLabel
            value="voucher"
            control={<Radio size="small" sx={{ color: OKAZION_ACCENT, '&.Mui-checked': { color: OKAZION_ACCENT } }} />}
            label={t.packages.useBoughtVoucher(unusedCount)}
          />
        ) : null}
        <FormControlLabel
          value="buy-bc"
          control={<Radio size="small" sx={{ color: OKAZION_ACCENT, '&.Mui-checked': { color: OKAZION_ACCENT } }} />}
          disabled={balance < OKAZION_PRICE_BC}
          label={`${t.packages.buyNow} · ${OKAZION_PRICE_BC} BC${balance < OKAZION_PRICE_BC ? ` ${t.packages.insufficientBc}` : ''}`}
        />
        <FormControlLabel
          value="buy-card"
          control={<Radio size="small" sx={{ color: OKAZION_ACCENT, '&.Mui-checked': { color: OKAZION_ACCENT } }} />}
          label={`${t.packages.buyNow} · ${OKAZION_PRICE_EUR}€`}
        />
      </RadioGroup>

      {value === 'buy-card' ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Pas publikimit do të ridrejtoheni te pagesa; më pas aplikoni voucher-in te njoftimi.
        </Typography>
      ) : null}
    </Box>
  );
}

/**
 * OKAZION create flow footer.
 * Uses a Grow/Elite package slot when available; otherwise card / Boost Coins.
 */
export function OkazionPostActions({
  submitting = false,
  disabled = false,
  onPost,
}: {
  submitting?: boolean;
  disabled?: boolean;
  onPost: (mode: OkazionPayMode) => void;
}) {
  const t = useCopy();
  const { user } = useUser();
  const balance = Number(user?.boostCredits) || 0;
  const canBc = balance >= OKAZION_PRICE_BC;
  const [planRemaining, setPlanRemaining] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const quota = await fetchOkazionPlanQuota();
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
          borderColor: OKAZION_ACCENT,
          bgcolor: OKAZION_ACCENT_SOFT,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
          <SealPercentIcon size={18} weight="regular" color={OKAZION_ACCENT} />
          <Typography sx={{ fontWeight: 800, color: OKAZION_ACCENT, fontSize: '0.95rem' }}>
            {t.packages.okazion7Days}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
          {hasPlanSlot
            ? t.packages.premiumWithPlan(planRemaining ?? 0, 7)
            : t.packages.okazionPaySubtitle}
        </Typography>
      </Box>

      {!quotaLoaded ? (
        <Button
          type="button"
          variant="contained"
          disabled
          sx={{
            ...submitBtnSx,
            bgcolor: OKAZION_RED,
            color: OKAZION_RED_ON,
            '&.Mui-disabled': { bgcolor: OKAZION_RED, color: OKAZION_RED_ON, opacity: 0.55 },
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
          startIcon={<SealPercentIcon size={18} weight="regular" />}
          sx={{
            ...submitBtnSx,
            bgcolor: OKAZION_RED,
            color: OKAZION_RED_ON,
            '&:hover': { bgcolor: OKAZION_RED_DARK, boxShadow: 'none' },
            '&.Mui-disabled': { bgcolor: OKAZION_RED, color: OKAZION_RED_ON, opacity: 0.55 },
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
              bgcolor: OKAZION_RED,
              color: OKAZION_RED_ON,
              '&:hover': { bgcolor: OKAZION_RED_DARK, boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: OKAZION_RED, color: OKAZION_RED_ON, opacity: 0.55 },
            }}
          >
            {submitting ? t.packages.posting : `${t.packages.post} · ${OKAZION_PRICE_EUR}€`}
          </Button>
          <Button
            type="button"
            variant="outlined"
            disabled={disabled || submitting || !canBc}
            onClick={() => onPost('buy-bc')}
            startIcon={<BoostCoinIcon size={18} />}
            sx={{
              ...submitBtnSx,
              borderColor: OKAZION_RED,
              color: OKAZION_RED,
              '&:hover': { borderColor: OKAZION_RED_DARK, bgcolor: OKAZION_RED_SOFT, boxShadow: 'none' },
              '&.Mui-disabled': { borderColor: OKAZION_RED, color: OKAZION_RED, opacity: 0.45 },
            }}
          >
            {submitting
              ? t.packages.posting
              : canBc
                ? `${t.packages.post} · ${OKAZION_PRICE_BC} BC`
                : `${OKAZION_PRICE_BC} BC ${t.packages.insufficientBc}`}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

export async function activateOkazionAfterCreate(params: {
  mode: OkazionBoostMode;
  kind: ListingMetricKind;
  listingId: string;
}): Promise<{ ok: boolean; message?: string; okazionUntil?: string; redirectToCheckout?: string }> {
  const { mode, kind, listingId } = params;
  if (mode === 'off') return { ok: true };

  if (mode === 'buy-card') {
    const q = new URLSearchParams({
      kind: 'okazion',
      packageId: OKAZION_PACKAGE_ID,
      quantity: '1',
      returnTo: `${paths.user.packagesExtra}?assignOkazion=1`,
    });
    return { ok: true, redirectToCheckout: `${paths.user.checkout}?${q.toString()}` };
  }

  if (mode === 'plan') {
    const res = await applyOkazionFromPlan({ kind, listingId });
    if (res.error || !res.okazionUntil) {
      return { ok: false, message: res.error || 'Aplikimi i OKAZION dështoi.' };
    }
    return { ok: true, okazionUntil: res.okazionUntil, message: res.message };
  }

  if (mode === 'voucher') {
    const vouchers = await listOkazionVouchers(true);
    const unused = (vouchers.vouchers ?? []).find((v) => v.status === 'unused');
    if (!unused) return { ok: false, message: 'Nuk u gjet voucher OKAZION.' };
    const res = await applyOkazionVoucher({
      voucherId: unused.id,
      kind,
      listingId,
    });
    if (res.error || !res.okazionUntil) {
      return { ok: false, message: res.error || 'Aplikimi i OKAZION dështoi.' };
    }
    return { ok: true, okazionUntil: res.okazionUntil, message: res.message };
  }

  if (mode === 'buy-bc') {
    const bought = await buyOkazionWithCredits(OKAZION_PACKAGE_ID, 1);
    if (bought.error || !bought.voucher) {
      return { ok: false, message: bought.error || 'Blerja me BC dështoi.' };
    }
    const res = await applyOkazionVoucher({
      voucherId: bought.voucher.id,
      kind,
      listingId,
    });
    if (res.error || !res.okazionUntil) {
      return { ok: false, message: res.error || 'Aplikimi i OKAZION dështoi.' };
    }
    return { ok: true, okazionUntil: res.okazionUntil, message: res.message };
  }

  return { ok: true };
}
