'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { ListingTrustBadge } from '@/components/public/listing-trust-badge';
import { PackageLeadsFeatureLabel } from '@/components/user/leads-how-it-works';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import type { AppMessages } from '@/lib/i18n/messages';
import { cancelMySubscription, listMySubscriptions } from '@/lib/payments-client';
import { listPublicContracts } from '@/lib/public-contracts-client';
import { paths } from '@/paths';
import { productButtonSx } from '@/styles/product-sx';
import type { PublicContract } from '@/types/contract';
import type { UserSubscriptionSummary } from '@/types/payment';
import {
  PackageCheckoutCard,
  formatEur,
  type FeatureListItem,
  type PlanAccent,
} from './package-ui';

function durationLabel(t: AppMessages, months: number): string {
  if (months === 1) return t.packages.monthly;
  if (months === 3) return t.packages.months3;
  if (months === 6) return t.packages.months6;
  if (months === 12) return t.packages.yearly;
  return t.packages.perMonths(months).replace(/^\//, '').trim();
}

function planSubtitle(t: AppMessages, plan: PublicContract, duration?: string): string {
  const bits = [t.packages.listingsCount(plan.maxListAllCategories)];
  if (plan.maxPremiumListings > 0) bits.push(`${plan.maxPremiumListings} Premium`);
  if (plan.maxOkazionListings > 0) bits.push(`${plan.maxOkazionListings} OKAZION`);
  if ((plan.boostCredits ?? 0) > 0) bits.push(`${plan.boostCredits} BC`);
  const base = bits.join(' · ');
  return duration ? `${duration} · ${base}` : base;
}

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
    lines.push(t.packages.okazionListingDays(plan.maxOkazionListings, 5));
  }
  if ((plan.boostCredits ?? 0) > 0) {
    lines.push(`${plan.boostCredits} Boost Coins`);
  }
  if (plan.refreshEveryHours != null) {
    lines.push(t.packages.refreshAfterHours(plan.refreshEveryHours));
  }
  if (plan.glowBadgeEnabled) {
    lines.push(t.packages.premiumBadge);
    lines.push({ id: 'save-leads', label: <PackageLeadsFeatureLabel /> });
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

/** Yellow pill when yearly (or longer) beats paying monthly. */
function savingsBadge(t: AppMessages, monthlyPrice: number | null, months: number, price: number): string | null {
  if (months <= 1 || monthlyPrice == null || monthlyPrice <= 0) return null;
  const full = monthlyPrice * months;
  if (price >= full) return null;
  const pct = Math.round((1 - price / full) * 100);
  return pct >= 5 ? t.packages.savePct(pct) : null;
}

function offerBadge(
  t: AppMessages,
  opts: {
    isCurrent: boolean;
    months: number;
    monthlyPrice: number | null;
    price: number;
  },
): string | null {
  if (opts.isCurrent) return t.packages.yourPlan;
  const save = savingsBadge(t, opts.monthlyPrice, opts.months, opts.price);
  if (save) return save;
  if (opts.months === 12) return t.packages.annual;
  return null;
}

export function MainPackagesPanel() {
  const router = useRouter();
  const t = useCopy();
  const { user } = useUser();
  const subscriberKindFilter =
    user?.accountType === 'business' || user?.role === 'business-user' ? 'company' : 'agent';

  const [plans, setPlans] = React.useState<PublicContract[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeSubscription, setActiveSubscription] = React.useState<UserSubscriptionSummary | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [canceling, setCanceling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = React.useState<string | null>(null);

  const activeContractId = activeSubscription?.contractId ?? null;
  const activePlanCode = activeSubscription?.planCode
    ? String(activeSubscription.planCode).toLowerCase()
    : null;
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
    const active =
      (subsRes.subscriptions ?? []).find((s) => s.status === 'active' && Number(s.priceEur) > 0) ?? null;
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

  if (!user) return null;

  const firstPaidTarget = React.useMemo(() => {
    for (const plan of plans) {
      const paidOptions = plan.priceOptions.filter((o) => o.price > 0);
      if (!paidOptions.length) continue;
      const monthly = paidOptions.find((o) => o.months === 1);
      const target = monthly ?? paidOptions[0];
      if (!target) continue;
      return { contractId: plan.id, months: target.months };
    }
    return null;
  }, [plans]);

  const cancelFooter =
    activeSubscription ? (
      <Button
        size="medium"
        color="error"
        variant="outlined"
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
        }}
      >
        {t.myPayments.cancelSubscription}
      </Button>
    ) : null;

  return (
    <Stack spacing={2.5}>
      {loading ? (
        <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}

      {error ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      {cancelSuccess ? (
        <Alert severity="success" sx={{ borderRadius: 2 }} onClose={() => setCancelSuccess(null)}>
          {cancelSuccess}
        </Alert>
      ) : null}

      {!loading && !error && plans.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          {t.packages.noActivePlan}
        </Alert>
      ) : null}

      {!loading && !error && plans.length > 0 ? (
        <Stack spacing={1.25}>
          {plans.flatMap((plan) => {
            const paidOptions = plan.priceOptions.filter((o) => o.price > 0);
            const isFree = plan.planCode === 'free' || plan.priceOptions.every((o) => o.price === 0);
            const planCode = (plan.planCode || '').toLowerCase();
            const hasPaidPlan = Boolean(activeContractId || activePlanCode);
            const isPlanCurrent =
              (activeContractId != null && activeContractId === plan.id) ||
              (activePlanCode != null && planCode === activePlanCode) ||
              (!hasPaidPlan && isFree);
            const accent = MAIN_PACKAGES_ACCENT;
            const monthlyPrice = plan.price1Month ?? paidOptions.find((o) => o.months === 1)?.price ?? null;
            const details = planFeatureLines(t, plan);
            const titleAdornment = plan.glowBadgeEnabled ? (
              <ListingTrustBadge size={20} />
            ) : undefined;

            if (isFree) {
              return [
                <PackageCheckoutCard
                  key={plan.id}
                  title={plan.title}
                  subtitle={planSubtitle(t, plan, t.packages.startFree)}
                  badge={isPlanCurrent ? t.packages.yourPlan : null}
                  titleAdornment={titleAdornment}
                  price="€0"
                  priceSuffix={t.packages.perMonth}
                  accent={accent}
                  selected={isPlanCurrent}
                  details={details}
                  onClick={
                    firstPaidTarget
                      ? () =>
                          router.push(
                            checkoutSubscriptionHref(firstPaidTarget.contractId, firstPaidTarget.months),
                          )
                      : undefined
                  }
                />,
              ];
            }

            const matchedMonths =
              activeMonths != null && paidOptions.some((o) => o.months === activeMonths)
                ? activeMonths
                : Math.max(...paidOptions.map((o) => o.months));

            return paidOptions.map((opt) => {
              const isCurrent = isPlanCurrent && opt.months === matchedMonths;
              const badge = offerBadge(t, {
                isCurrent,
                months: opt.months,
                monthlyPrice,
                price: opt.price,
              });

              return (
                <PackageCheckoutCard
                  key={`${plan.id}-${opt.months}`}
                  title={plan.title}
                  subtitle={planSubtitle(t, plan, durationLabel(t, opt.months))}
                  badge={badge}
                  titleAdornment={titleAdornment}
                  price={formatEur(opt.price)}
                  priceSuffix={priceSuffixForMonths(t, opt.months)}
                  accent={accent}
                  selected={isCurrent}
                  details={details}
                  footer={isCurrent ? cancelFooter : undefined}
                  onClick={
                    isCurrent
                      ? undefined
                      : () => router.push(checkoutSubscriptionHref(plan.id, opt.months))
                  }
                />
              );
            });
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
            <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }}>
              {cancelError}
            </Alert>
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
