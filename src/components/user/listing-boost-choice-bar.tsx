'use client';

import * as React from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { CrownSimple as CrownSimpleIcon } from '@phosphor-icons/react/dist/ssr/CrownSimple';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';

import {
  ProductDialog,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import {
  OKAZION_PRICE_BC,
  OKAZION_PRICE_EUR,
  type OkazionBoostMode,
} from '@/components/user/okazion-boost-upsell';
import {
  PREMIUM_AMBER,
  PREMIUM_AMBER_DARK,
  PREMIUM_AMBER_ON,
  PREMIUM_AMBER_SOFT,
  PREMIUM_PACKAGE_ID,
  type PremiumPayMode,
} from '@/components/user/premium-boost-upsell';
import { formatEurWithLifetime } from '@/components/user/packages/package-ui';
import { useCopy } from '@/hooks/use-copy';
import { useLifetimePackageDiscount } from '@/hooks/use-lifetime-package-discount';
import { useUser } from '@/hooks/use-user';
import {
  OKAZION_ACCENT,
  OKAZION_ACCENT_SOFT,
  OKAZION_RED,
  OKAZION_RED_DARK,
  OKAZION_RED_ON,
  OKAZION_RED_SOFT,
} from '@/lib/home-categories';
import {
  fetchOkazionPlanQuota,
  fetchPremiumPlanQuota,
  listOkazionVouchers,
  listPremiumPackages,
} from '@/lib/payments-client';
import { productButtonSx } from '@/styles/product-sx';
import type { PremiumPackage } from '@/types/payment';

const FALLBACK_PREMIUM: PremiumPackage[] = [
  {
    id: 'premium-15',
    days: 15,
    priceBc: 200,
    priceEur: 18,
    labelSq: '15 ditë Premium',
    labelEn: '15 Days Premium Listing',
  },
  {
    id: 'premium-30',
    days: 30,
    priceBc: 300,
    priceEur: 27,
    labelSq: '30 ditë Premium',
    labelEn: '30 Days Premium Listing',
  },
];

const choiceBtnSx = {
  ...productButtonSx,
  flex: 1,
  minHeight: 48,
  px: 1.5,
} as const;

function filledAccentBtnSx(bg: string, hoverBg: string, onColor: string) {
  return {
    ...choiceBtnSx,
    borderRadius: 999,
    bgcolor: bg,
    color: onColor,
    boxShadow: 'none',
    '& .MuiButton-startIcon': { mr: 0.75 },
    '&:hover': {
      bgcolor: hoverBg,
      color: onColor,
      boxShadow: 'none',
    },
    '&.Mui-disabled': {
      bgcolor: bg,
      color: onColor,
      opacity: 0.55,
    },
  } as const;
}

/**
 * Premium + OKAZION shortcuts above the normal Posto button.
 * Uses a plan/voucher slot immediately when available; otherwise opens a pay popup.
 * Directory profiles (businesses / professionals) pass hideOkazion — OKAZION is sellable-only.
 */
export function ListingBoostChoiceBar({
  submitting = false,
  disabled = false,
  hideOkazion = false,
  onPostPremium,
  onPostOkazion,
}: {
  submitting?: boolean;
  disabled?: boolean;
  /** When true, only Premium is shown (directory create flow). */
  hideOkazion?: boolean;
  onPostPremium: (mode: PremiumPayMode, packageId: string) => void;
  onPostOkazion?: (mode: Exclude<OkazionBoostMode, 'off'>) => void;
}) {
  const t = useCopy();
  const { user } = useUser();
  const lifetimePercent = useLifetimePackageDiscount();
  const balance = Number(user?.boostCredits) || 0;

  const [busy, setBusy] = React.useState<'premium' | 'okazion' | null>(null);
  const [dialog, setDialog] = React.useState<'premium' | 'okazion' | null>(null);
  const [premiumPackages, setPremiumPackages] = React.useState<PremiumPackage[]>(FALLBACK_PREMIUM);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await listPremiumPackages();
      if (cancelled || !res.packages?.length) return;
      setPremiumPackages(res.packages);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const closeDialog = () => setDialog(null);

  const handlePremium = async () => {
    if (disabled || submitting || busy) return;
    setBusy('premium');
    try {
      const quota = await fetchPremiumPlanQuota();
      if ((quota.quota?.remaining ?? 0) > 0) {
        onPostPremium('plan', PREMIUM_PACKAGE_ID);
        return;
      }
      setDialog('premium');
    } finally {
      setBusy(null);
    }
  };

  const handleOkazion = async () => {
    if (hideOkazion || !onPostOkazion || disabled || submitting || busy) return;
    setBusy('okazion');
    try {
      const [quota, vouchers] = await Promise.all([
        fetchOkazionPlanQuota(),
        listOkazionVouchers(true),
      ]);
      if ((quota.quota?.remaining ?? 0) > 0) {
        onPostOkazion('plan');
        return;
      }
      const unused = (vouchers.vouchers ?? []).some((v) => v.status === 'unused');
      if (unused) {
        onPostOkazion('voucher');
        return;
      }
      setDialog('okazion');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Stack direction="row" spacing={1.25} sx={{ width: '100%' }}>
        <Button
          type="button"
          variant="contained"
          disabled={disabled || submitting || busy !== null}
          onClick={() => void handlePremium()}
          startIcon={
            busy === 'premium' ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <CrownSimpleIcon size={18} weight="regular" />
            )
          }
          sx={filledAccentBtnSx(PREMIUM_AMBER, PREMIUM_AMBER_DARK, PREMIUM_AMBER_ON)}
        >
          Premium
        </Button>
        {hideOkazion ? null : (
          <Button
            type="button"
            variant="contained"
            disabled={disabled || submitting || busy !== null}
            onClick={() => void handleOkazion()}
            startIcon={
              busy === 'okazion' ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SealPercentIcon size={18} weight="regular" />
              )
            }
            sx={filledAccentBtnSx(OKAZION_RED, OKAZION_RED_DARK, '#000000')}
          >
            OKAZION
          </Button>
        )}
      </Stack>

      <ProductDialog open={dialog === 'premium'} onClose={closeDialog} fullWidth maxWidth="xs">
        <ProductDialogTitle
          onClose={closeDialog}
          subtitle={t.packages.premiumPaySubtitle}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <CrownSimpleIcon size={20} weight="regular" color={PREMIUM_AMBER} />
            <Box component="span" sx={{ color: PREMIUM_AMBER }}>
              {t.packages.postPremium}
            </Box>
          </Stack>
        </ProductDialogTitle>
        <ProductDialogContent>
          <Stack spacing={1.5}>
            {premiumPackages.map((pkg) => {
              const canBc = balance >= pkg.priceBc;
              return (
                <Box
                  key={pkg.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: PREMIUM_AMBER,
                    bgcolor: PREMIUM_AMBER_SOFT,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: PREMIUM_AMBER, mb: 1 }}>
                    {t.packages.daysPrice(pkg.days, pkg.priceEur, pkg.priceBc)}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      type="button"
                      variant="contained"
                      disabled={disabled || submitting}
                      onClick={() => {
                        closeDialog();
                        onPostPremium('buy-card', pkg.id);
                      }}
                      startIcon={<CreditCardIcon size={16} weight="bold" />}
                      sx={{
                        ...productButtonSx,
                        flex: 1,
                        minHeight: 42,
                        bgcolor: PREMIUM_AMBER,
                        color: PREMIUM_AMBER_ON,
                        '&:hover': { bgcolor: PREMIUM_AMBER_DARK, boxShadow: 'none' },
                      }}
                    >
                      {formatEurWithLifetime(pkg.priceEur, lifetimePercent)}
                    </Button>
                    <Button
                      type="button"
                      variant="outlined"
                      disabled={disabled || submitting || !canBc}
                      onClick={() => {
                        closeDialog();
                        onPostPremium('buy-bc', pkg.id);
                      }}
                      startIcon={<BoostCoinIcon size={16} />}
                      sx={{
                        ...productButtonSx,
                        flex: 1,
                        minHeight: 42,
                        borderColor: PREMIUM_AMBER,
                        color: PREMIUM_AMBER,
                        '&:hover': {
                          borderColor: PREMIUM_AMBER_DARK,
                          bgcolor: PREMIUM_AMBER_SOFT,
                          boxShadow: 'none',
                        },
                      }}
                    >
                      {canBc ? `${pkg.priceBc} BC` : 'BC'}
                    </Button>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </ProductDialogContent>
      </ProductDialog>

      {hideOkazion || !onPostOkazion ? null : (
        <ProductDialog open={dialog === 'okazion'} onClose={closeDialog} fullWidth maxWidth="xs">
          <ProductDialogTitle
            onClose={closeDialog}
            subtitle={t.packages.okazionPaySubtitle}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <SealPercentIcon size={20} weight="regular" color={OKAZION_ACCENT} />
              <Box component="span" sx={{ color: OKAZION_ACCENT }}>
                {t.packages.postOkazion}
              </Box>
            </Stack>
          </ProductDialogTitle>
          <ProductDialogContent>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: OKAZION_ACCENT,
                bgcolor: OKAZION_ACCENT_SOFT,
                mb: 1.5,
              }}
            >
              <Typography sx={{ fontWeight: 800, color: OKAZION_ACCENT }}>
                {t.packages.daysPrice(7, OKAZION_PRICE_EUR, OKAZION_PRICE_BC)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                type="button"
                variant="contained"
                disabled={disabled || submitting}
                onClick={() => {
                  closeDialog();
                  onPostOkazion('buy-card');
                }}
                startIcon={<CreditCardIcon size={16} weight="bold" />}
                sx={{
                  ...productButtonSx,
                  flex: 1,
                  minHeight: 44,
                  bgcolor: OKAZION_RED,
                  color: OKAZION_RED_ON,
                  '&:hover': { bgcolor: OKAZION_RED_DARK, boxShadow: 'none' },
                }}
              >
                {formatEurWithLifetime(OKAZION_PRICE_EUR, lifetimePercent)}
              </Button>
              <Button
                type="button"
                variant="outlined"
                disabled={disabled || submitting || balance < OKAZION_PRICE_BC}
                onClick={() => {
                  closeDialog();
                  onPostOkazion('buy-bc');
                }}
                startIcon={<BoostCoinIcon size={16} />}
                sx={{
                  ...productButtonSx,
                  flex: 1,
                  minHeight: 44,
                  borderColor: OKAZION_RED,
                  color: OKAZION_RED,
                  '&:hover': {
                    borderColor: OKAZION_RED_DARK,
                    bgcolor: OKAZION_RED_SOFT,
                    boxShadow: 'none',
                  },
                }}
              >
                {balance >= OKAZION_PRICE_BC
                  ? `${OKAZION_PRICE_BC} BC`
                  : `${OKAZION_PRICE_BC} BC ${t.packages.insufficientBc}`}
              </Button>
            </Stack>
          </ProductDialogContent>
        </ProductDialog>
      )}
    </>
  );
}
