'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

import type { PublicContract } from '@/types/contract';
import type { UserSubscriptionSummary } from '@/types/payment';
import { paths } from '@/paths';
import {
  isMainPackageBillingMonths,
  MAIN_PACKAGE_BILLING_MONTHS,
  type MainPackageBillingMonths,
} from '@/lib/contract-pricing';
import type { AppMessages } from '@/lib/i18n/messages';
import { cancelMySubscription, listMySubscriptions } from '@/lib/payments-client';
import { listPublicContracts } from '@/lib/public-contracts-client';
import { useCopy } from '@/hooks/use-copy';
import { useLifetimePackageDiscount } from '@/hooks/use-lifetime-package-discount';
import { useUser } from '@/hooks/use-user';
import { PackageRowsSkeleton } from '@/components/core/content-skeletons';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { TransientNotification, TransientSuccessAlert } from '@/components/core/transient-success-alert';
import { MOTION } from '@/styles/motion';
import { productButtonSx } from '@/styles/product-sx';

import {
  formatEur,
  PackageCheckoutCard,
  PackageEurPrice,
  planIconForCode,
  ReferralDiscountNote,
  type FeatureListItem,
  type PlanAccent,
} from './package-ui';

function planFeatureLines(t: AppMessages, plan: PublicContract): FeatureListItem[] {
  const lines: FeatureListItem[] = [
    t.packages.upToListings(plan.maxListAllCategories),
    t.packages.apartmentListings(plan.maxApartmentListings),
    t.packages.carListings(plan.maxCarListings),
    t.packages.jobListings(plan.maxJobListings),
    t.packages.productListings(plan.maxProductListings),
  ];
  if (plan.maxPremiumListings > 0) {
    lines.push(t.packages.premiumListingDays(plan.maxPremiumListings, 30));
  }
  if (plan.maxOkazionListings > 0) {
    lines.push(t.packages.okazionListingDays(plan.maxOkazionListings, 7));
  }
  if ((plan.boostCredits ?? 0) > 0) {
    lines.push(`${plan.boostCredits} Boost Coins`);
  }
  if (plan.refreshEveryHours != null) {
    lines.push(t.packages.refreshAfterHours(plan.refreshEveryHours));
  }
  return lines;
}

function checkoutSubscriptionHref(contractId: string, months: number) {
  const q = new URLSearchParams({
    kind: 'subscription',
    contractId,
    months: String(months),
    returnTo: paths.user.packagesMain,
  });
  return `${paths.user.checkout}?${q.toString()}`;
}

const MAIN_PACKAGES_ACCENT: PlanAccent = 'primary';

function priceSuffixForMonths(t: AppMessages, months: number): string {
  if (months === 1) return t.packages.perMonth;
  if (months === 12) return t.packages.perYear;
  return t.packages.perMonths(months);
}

function billingLabel(t: AppMessages, months: MainPackageBillingMonths): string {
  if (months === 1) return t.packages.monthly;
  if (months === 6) return t.packages.months6;
  return t.packages.months12;
}

function equivalentMonthlyHint(t: AppMessages, months: number, price: number): string | null {
  if (months <= 1 || price <= 0) return null;
  return t.packages.equivPerMonth(formatEur(price / months));
}

const PILL_INSET_PX = 4;
const PILL_SLIDE_MS = 320;

/** Yellow pill when yearly (or longer) beats paying monthly. */
function savingsBadge(t: AppMessages, monthlyPrice: number | null, months: number, price: number): string | null {
  if (months <= 1 || monthlyPrice == null || monthlyPrice <= 0) return null;
  const full = monthlyPrice * months;
  if (price >= full) return null;
  const pct = Math.round((1 - price / full) * 100);
  return pct >= 5 ? t.packages.savePct(pct) : null;
}

function durationSaveLabel(t: AppMessages, plans: PublicContract[], months: MainPackageBillingMonths): string | null {
  if (months <= 1) return null;
  for (const plan of plans) {
    const monthly = plan.priceOptions.find((o) => o.months === 1 && o.price > 0);
    const opt = plan.priceOptions.find((o) => o.months === months && o.price > 0);
    if (!monthly || !opt) continue;
    return savingsBadge(t, monthly.price, months, opt.price);
  }
  return null;
}

function titleBadge(t: AppMessages, isCurrent: boolean): string | null {
  return isCurrent ? t.packages.yourPlan : null;
}

function BillingPeriodPillBar({
  value,
  onChange,
  available,
  plans,
  t,
}: {
  value: MainPackageBillingMonths;
  onChange: (months: MainPackageBillingMonths) => void;
  available: readonly MainPackageBillingMonths[];
  plans: PublicContract[];
  t: AppMessages;
}) {
  const slotCount = MAIN_PACKAGE_BILLING_MONTHS.length;
  const selectedIndex = Math.max(0, MAIN_PACKAGE_BILLING_MONTHS.indexOf(value));
  const [indicatorIndex, setIndicatorIndex] = React.useState(selectedIndex);
  const [transitionReady, setTransitionReady] = React.useState(false);

  React.useEffect(() => {
    if (!transitionReady) {
      setIndicatorIndex(selectedIndex);
      const frame = requestAnimationFrame(() => setTransitionReady(true));
      return () => cancelAnimationFrame(frame);
    }
    setIndicatorIndex(selectedIndex);
    return undefined;
  }, [selectedIndex, transitionReady]);

  return (
    <Box
      role="radiogroup"
      aria-label={t.packages.billingPeriod}
      sx={(theme) => ({
        height: 52,
        boxSizing: 'border-box',
        p: `${PILL_INSET_PX}px`,
        overflow: 'hidden',
        borderRadius: 999,
        border: 'none',
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.055)'),
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        boxShadow: 'none',
        ...theme.applyStyles('dark', {
          bgcolor: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: 'none',
        }),
      })}
    >
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: `${100 / slotCount}%`,
            borderRadius: 999,
            bgcolor: 'primary.main',
            transform: `translate3d(${indicatorIndex * 100}%, 0, 0)`,
            transition: transitionReady ? `transform ${PILL_SLIDE_MS}ms ${MOTION.ease}, opacity 180ms ease` : 'none',
            pointerEvents: 'none',
            zIndex: 0,
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
            },
          }}
        />
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))`,
            height: '100%',
          }}
        >
          {MAIN_PACKAGE_BILLING_MONTHS.map((months) => {
            const selected = months === value;
            const disabled = !available.includes(months);
            const save = durationSaveLabel(t, plans, months);
            return (
              <Box
                key={months}
                component="button"
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={billingLabel(t, months)}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  onChange(months);
                }}
                sx={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  fontFamily: 'inherit',
                  WebkitTapHighlightColor: 'transparent',
                  minWidth: 0,
                  height: '100%',
                  px: 0.75,
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.1,
                  border: 'none',
                  borderRadius: 999,
                  bgcolor: 'transparent',
                  color: disabled ? 'text.disabled' : selected ? 'primary.contrastText' : 'text.secondary',
                  cursor: disabled ? 'default' : 'pointer',
                  transition: `color 200ms ${MOTION.ease}, transform 160ms ${MOTION.ease}`,
                  '&:active': disabled
                    ? undefined
                    : {
                        transform: 'scale(0.94)',
                      },
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                    '&:active': { transform: 'none' },
                  },
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    lineHeight: 1.15,
                    letterSpacing: '0.01em',
                    color: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {billingLabel(t, months)}
                </Typography>
                {save ? (
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: 750,
                      fontSize: '0.62rem',
                      lineHeight: 1.1,
                      opacity: 1,
                      color: selected ? 'inherit' : 'primary.main',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {save}
                  </Typography>
                ) : null}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

export function MainPackagesPanel() {
  const router = useRouter();
  const t = useCopy();
  const { user } = useUser();
  const subscriberKindFilter = user?.accountType === 'business' || user?.role === 'business-user' ? 'company' : 'agent';

  const [plans, setPlans] = React.useState<PublicContract[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeSubscription, setActiveSubscription] = React.useState<UserSubscriptionSummary | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [canceling, setCanceling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = React.useState<string | null>(null);
  const [pickedMonths, setPickedMonths] = React.useState<MainPackageBillingMonths>(1);
  const lifetimePercent = useLifetimePackageDiscount();

  const activeContractId = activeSubscription?.contractId ?? null;
  const activePlanCode = activeSubscription?.planCode ? String(activeSubscription.planCode).toLowerCase() : null;
  const activeMonths = activeSubscription?.months ?? null;

  const reload = React.useCallback(async () => {
    const [{ contracts, error: err }, subsRes] = await Promise.all([
      listPublicContracts({ subscriberKind: subscriberKindFilter }),
      listMySubscriptions(),
    ]);
    if (err) {
      setError(err);
      setPlans([]);
    } else {
      setError(null);
      setPlans(contracts ?? []);
    }
    const active = (subsRes.subscriptions ?? []).find((s) => s.status === 'active' && Number(s.priceEur) > 0) ?? null;
    setActiveSubscription(active);
  }, [subscriberKindFilter]);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reload]);

  const handleConfirmCancel = async () => {
    if (!activeSubscription || canceling) return;
    setCanceling(true);
    setCancelError(null);
    const res = await cancelMySubscription(activeSubscription.id);
    setCanceling(false);
    if (res.error || !res.subscription) {
      setCancelError(res.error || t.myPayments.cancelFailed);
      return;
    }
    setActiveSubscription(null);
    setCancelSuccess(t.myPayments.cancelSuccess);
    setCancelOpen(false);
    await reload();
  };

  const availableBillingMonths = React.useMemo(() => {
    const priced = new Set<MainPackageBillingMonths>();
    for (const plan of plans) {
      for (const opt of plan.priceOptions) {
        if (opt.price > 0 && isMainPackageBillingMonths(opt.months)) {
          priced.add(opt.months);
        }
      }
    }
    return MAIN_PACKAGE_BILLING_MONTHS.filter((months) => priced.has(months));
  }, [plans]);

  const selectedMonths: MainPackageBillingMonths = React.useMemo(() => {
    if (availableBillingMonths.includes(pickedMonths)) return pickedMonths;
    if (availableBillingMonths.includes(1)) return 1;
    return availableBillingMonths[0] ?? 1;
  }, [pickedMonths, availableBillingMonths]);

  if (!user) return null;

  const cancelFooter = activeSubscription ? (
    <Button
      size="medium"
      variant="text"
      fullWidth
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setCancelError(null);
        setCancelOpen(true);
      }}
      sx={{
        ...productButtonSx,
        fontWeight: 750,
        borderRadius: 2,
        py: 1,
        border: 'none',
        boxShadow: 'none',
        bgcolor: (theme) => alpha(theme.palette.error.main, 0.16),
        color: 'error.main',
        '&:hover': {
          border: 'none',
          boxShadow: 'none',
          bgcolor: (theme) => alpha(theme.palette.error.main, 0.24),
        },
      }}
    >
      {t.myPayments.cancelSubscription}
    </Button>
  ) : null;

  return (
    <Stack spacing={2.5}>
      {loading ? <PackageRowsSkeleton count={3} rowHeight={220} /> : null}

      {error ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      <TransientSuccessAlert
        message={cancelSuccess}
        onDismiss={() => setCancelSuccess(null)}
        sx={{ borderRadius: 2 }}
      />

      {!loading && !error && plans.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          {t.packages.noActivePlan}
        </Alert>
      ) : null}

      {!loading && !error && plans.length > 0 ? (
        <Stack spacing={1.75}>
          <ReferralDiscountNote percent={lifetimePercent} />
          <BillingPeriodPillBar
            value={selectedMonths}
            onChange={setPickedMonths}
            available={availableBillingMonths}
            plans={plans}
            t={t}
          />
          {plans.flatMap((plan) => {
            const paidOptions = plan.priceOptions.filter((o) => o.price > 0);
            const isFree = plan.planCode === 'free' || plan.priceOptions.every((o) => o.price === 0);
            // Free is included with every account — not purchasable; skip the card.
            if (isFree) return [];

            const planCode = (plan.planCode || '').toLowerCase();
            const isPlanCurrent =
              (activeContractId != null && activeContractId === plan.id) ||
              (activePlanCode != null && planCode === activePlanCode);
            const accent = MAIN_PACKAGES_ACCENT;
            const monthlyPrice = plan.price1Month ?? paidOptions.find((o) => o.months === 1)?.price ?? null;
            const details = planFeatureLines(t, plan);
            const PlanIcon = planIconForCode(plan.planCode);

            const opt = paidOptions.find((o) => o.months === selectedMonths);
            if (!opt) return [];

            const isCurrent = isPlanCurrent && activeMonths === selectedMonths;
            const save = isCurrent ? null : savingsBadge(t, monthlyPrice, opt.months, opt.price);

            return [
              <PackageCheckoutCard
                key={`${plan.id}-${opt.months}`}
                icon={PlanIcon}
                title={plan.title}
                badge={titleBadge(t, isCurrent)}
                price={<PackageEurPrice listPrice={opt.price} percent={lifetimePercent} />}
                priceSuffix={priceSuffixForMonths(t, opt.months)}
                priceHint={equivalentMonthlyHint(t, opt.months, opt.price)}
                priceBadge={save}
                accent={accent}
                selected={isCurrent}
                details={details}
                footer={isCurrent ? cancelFooter : undefined}
                onClick={isCurrent ? undefined : () => router.push(checkoutSubscriptionHref(plan.id, opt.months))}
              />,
            ];
          })}
        </Stack>
      ) : null}

      {!loading && plans.length > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t.packages.subscriptionNote}
        </Typography>
      ) : null}

      <ProductDialog
        open={cancelOpen}
        onClose={canceling ? undefined : () => setCancelOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <ProductDialogTitle onClose={canceling ? undefined : () => setCancelOpen(false)}>
          {t.myPayments.cancelConfirmTitle}
        </ProductDialogTitle>
        <ProductDialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontWeight: 550 }}>
            {activeSubscription
              ? `${activeSubscription.contractTitle || 'Abonim'} · ${activeSubscription.months} muaj. ${t.myPayments.cancelConfirmBody}`
              : t.myPayments.cancelConfirmBody}
          </Typography>
          {cancelError ? (
            <TransientNotification
              severity="error"
              message={cancelError}
              onDismiss={() => setCancelError(null)}
              sx={{ mt: 1.5, borderRadius: 2 }}
            />
          ) : null}
        </ProductDialogContent>
        <ProductDialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={canceling} sx={productButtonSx}>
            {t.myPayments.keepSubscription}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={canceling}
            onClick={() => void handleConfirmCancel()}
            sx={productButtonSx}
          >
            {canceling ? t.myPayments.canceling : t.myPayments.cancelConfirmCta}
          </Button>
        </ProductDialogActions>
      </ProductDialog>
    </Stack>
  );
}
