'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';

import { useUser } from '@/hooks/use-user';
import { listPublicContracts } from '@/lib/public-contracts-client';
import { createSubscriptionOrder, listMySubscriptions } from '@/lib/payments-client';
import type { PublicContract } from '@/types/contract';
import type { ContractPriceOption } from '@/lib/contract-pricing';
import { PokCheckoutDialog } from '@/components/payments/pok-checkout-dialog';

function planFeatureLines(plan: PublicContract): string[] {
  const lines: string[] = [
    `0/${plan.maxListAllCategories} List in All Categories`,
    `0/${plan.maxJobListings} Job Listings`,
    `0/${plan.maxCarListings} Car Listings`,
    `0/${plan.maxApartmentListings} Apartment Listings`,
    `0/${plan.maxProductListings} Product Listings`,
  ];
  if (plan.maxPremiumListings > 0) {
    lines.push(`0/${plan.maxPremiumListings} Premium Listing`);
  }
  if ((plan.boostCredits ?? 0) > 0) {
    lines.push(`${plan.boostCredits} Boost Coins`);
  }
  if (plan.refreshEveryHours != null) {
    lines.push(`Refresh Every ${plan.refreshEveryHours} Hours`);
  }
  if (plan.glowBadgeEnabled) {
    lines.push('Trust Badge');
  }
  return lines;
}

type PendingPlanCheckout = {
  contract: PublicContract;
  option: ContractPriceOption;
};

export function MainPackagesPanel() {
  const { user, checkSession } = useUser();
  const subscriberKindFilter =
    user?.accountType === 'business' || user?.role === 'business-user' ? 'company' : 'agent';

  const [plans, setPlans] = React.useState<PublicContract[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeContractId, setActiveContractId] = React.useState<string | null>(null);
  const [planCheckout, setPlanCheckout] = React.useState<PendingPlanCheckout | null>(null);

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
    setActiveContractId(active?.contractId ?? null);
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

  if (!user) return null;

  return (
    <Stack spacing={2}>
      {loading ? (
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}

      {error ? (
        <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
          {error}
        </Alert>
      ) : null}

      {!loading && !error && plans.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Për momentin nuk ka plan aktiv me çmim për llogarinë tuaj.
        </Typography>
      ) : null}

      {!loading && !error && plans.length > 0
        ? plans.map((plan) => {
            const paidOptions = plan.priceOptions.filter((o) => o.price > 0);
            const isFree = plan.planCode === 'free' || plan.priceOptions.every((o) => o.price === 0);
            const isCurrent =
              (activeContractId && activeContractId === plan.id) || (!activeContractId && isFree);
            return (
              <Box
                key={plan.id}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: isCurrent ? 'primary.main' : 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}
                >
                  <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>{plan.title}</Typography>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    {isCurrent ? (
                      <Chip size="small" color="primary" label="Aktuale" sx={{ fontWeight: 700 }} />
                    ) : null}
                    {plan.glowBadgeEnabled ? (
                      <Chip size="small" label="Trust Badge" sx={{ fontWeight: 700 }} />
                    ) : null}
                  </Stack>
                </Stack>
                <Stack component="ul" spacing={0.35} sx={{ m: 0, mt: 1.25, pl: 2.25 }}>
                  {planFeatureLines(plan).map((line) => (
                    <Typography key={line} component="li" variant="body2" color="text.secondary">
                      {line}
                    </Typography>
                  ))}
                </Stack>
                {isFree ? (
                  <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 700 }}>
                    €0 · Falas
                  </Typography>
                ) : (
                  <Stack direction="row" sx={{ flexWrap: 'wrap', mt: 1.5, gap: 1 }}>
                    {paidOptions.map((opt) => (
                      <Button
                        key={opt.months}
                        size="small"
                        variant="outlined"
                        onClick={() => setPlanCheckout({ contract: plan, option: opt })}
                        sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 999 }}
                      >
                        {`${opt.labelSq} · ${opt.price} € — Blej`}
                      </Button>
                    ))}
                  </Stack>
                )}
              </Box>
            );
          })
        : null}

      {planCheckout ? (
        <PokCheckoutDialog
          open={Boolean(planCheckout)}
          onClose={() => setPlanCheckout(null)}
          title="Abonohu në plan"
          summary={
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                  Abonim
                </Typography>
                <Typography sx={{ fontWeight: 700, lineHeight: 1.25 }}>{planCheckout.contract.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {planCheckout.option.labelSq} · {planCheckout.option.months} muaj
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', whiteSpace: 'nowrap' }}>
                {planCheckout.option.price} €
              </Typography>
            </Stack>
          }
          createOrder={() => createSubscriptionOrder(planCheckout.contract.id, planCheckout.option.months)}
          onPaid={() => {
            void checkSession();
            void reload();
          }}
        />
      ) : null}
    </Stack>
  );
}
