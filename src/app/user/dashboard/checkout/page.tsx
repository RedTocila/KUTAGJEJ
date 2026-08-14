'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';

import { CheckoutSkeleton } from '@/components/core/content-skeletons';
import { PokCheckoutView } from '@/components/payments/pok-checkout-view';
import { PackageEurPrice } from '@/components/user/packages/package-ui';
import { useLifetimePackageDiscount } from '@/hooks/use-lifetime-package-discount';
import { useUser } from '@/hooks/use-user';
import {
  createAutoRefreshOrder,
  createCreditsOrder,
  createOkazionOrder,
  createPremiumOrder,
  createSubscriptionOrder,
  listAutoRefreshPackages,
  listCreditPackages,
  listOkazionPackages,
  listPremiumPackages,
} from '@/lib/payments-client';
import { listPublicContracts } from '@/lib/public-contracts-client';
import { paths } from '@/paths';
import type { AutoRefreshPackage, CreditPackage, OkazionPackage, PremiumPackage } from '@/types/payment';
import type { PublicContract } from '@/types/contract';

function formatBc(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

type CreditsCheckout = {
  kind: 'credits';
  pkg: CreditPackage;
  returnTo: string;
};

type SubscriptionCheckout = {
  kind: 'subscription';
  contract: PublicContract;
  months: number;
  price: number;
  labelSq: string;
  returnTo: string;
};

type AutoRefreshCheckout = {
  kind: 'auto-refresh';
  pkg: AutoRefreshPackage;
  returnTo: string;
};

type PremiumCheckout = {
  kind: 'premium';
  pkg: PremiumPackage;
  returnTo: string;
};

type OkazionCheckout = {
  kind: 'okazion';
  pkg: OkazionPackage;
  quantity: number;
  returnTo: string;
};

type ReadyCheckout =
  | CreditsCheckout
  | SubscriptionCheckout
  | AutoRefreshCheckout
  | PremiumCheckout
  | OkazionCheckout;

export default function UserCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkSession } = useUser();
  const lifetimePercent = useLifetimePackageDiscount();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [checkout, setCheckout] = React.useState<ReadyCheckout | null>(null);

  const kind = searchParams.get('kind');
  const packageId = searchParams.get('packageId');
  const contractId = searchParams.get('contractId');
  const monthsRaw = searchParams.get('months');
  const quantityRaw = searchParams.get('quantity');
  const returnToParam = searchParams.get('returnTo');

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      setCheckout(null);

      const returnTo =
        returnToParam && returnToParam.startsWith('/user/')
          ? returnToParam
          : kind === 'subscription'
            ? paths.user.packagesMain
            : kind === 'okazion'
              ? `${paths.user.packagesExtra}?assignOkazion=1`
              : kind === 'auto-refresh' || kind === 'premium'
                ? `${paths.user.packagesExtra}?assignPremium=1`
                : paths.user.credits;

      if (kind === 'credits' && packageId) {
        const { packages: pkgs, error: err } = await listCreditPackages();
        if (cancelled) return;
        const catalog =
          pkgs && pkgs.length > 0
            ? pkgs
            : [
                { id: 'Starter', credits: 100, bonusCredits: 0, priceEur: 9, labelSq: 'Starter' },
                { id: 'Growth', credits: 300, bonusCredits: 40, priceEur: 27, labelSq: 'Growth', badgeSq: '+40 BC' },
                { id: 'Pro', credits: 800, bonusCredits: 200, priceEur: 75, labelSq: 'Pro', badgeSq: '+200 BC' },
                { id: 'Elite', credits: 2000, bonusCredits: 500, priceEur: 180, labelSq: 'Elite', badgeSq: '+500 BC' },
                {
                  id: 'Competitor',
                  credits: 4000,
                  bonusCredits: 900,
                  priceEur: 360,
                  labelSq: 'Competitor',
                  badgeSq: '+900 BC',
                },
                {
                  id: 'Dominator',
                  credits: 8000,
                  bonusCredits: 1500,
                  priceEur: 750,
                  labelSq: 'Dominator',
                  badgeSq: '+1500 BC',
                },
              ];
        if (err && !(pkgs && pkgs.length)) {
          // Still allow checkout via label lookup on the API if catalog seeded.
        }
        const pkg = catalog.find((p) => p.id === packageId || p.labelSq === packageId);
        if (!pkg) {
          setError(err || 'Paketa nuk u gjet.');
          setLoading(false);
          return;
        }
        // Prefer real UUID from API; fall back to label for seeded catalog lookup.
        setCheckout({
          kind: 'credits',
          pkg: pkgs && pkgs.length > 0 ? pkg : { ...pkg, id: pkg.labelSq || pkg.id },
          returnTo,
        });
        setLoading(false);
        return;
      }

      if (kind === 'auto-refresh' && packageId) {
        const { packages: pkgs, error: err } = await listAutoRefreshPackages();
        if (cancelled) return;
        if (err) {
          setError(err);
          setLoading(false);
          return;
        }
        const pkg = (pkgs ?? []).find((p) => p.id === packageId);
        if (!pkg) {
          setError('Paketa Auto-Refresh nuk u gjet.');
          setLoading(false);
          return;
        }
        setCheckout({ kind: 'auto-refresh', pkg, returnTo: paths.user.packagesExtra });
        setLoading(false);
        return;
      }

      if (kind === 'premium' && packageId) {
        const { packages: pkgs, error: err } = await listPremiumPackages();
        if (cancelled) return;
        if (err) {
          setError(err);
          setLoading(false);
          return;
        }
        const pkg = (pkgs ?? []).find((p) => p.id === packageId);
        if (!pkg) {
          setError('Paketa Premium nuk u gjet.');
          setLoading(false);
          return;
        }
        setCheckout({
          kind: 'premium',
          pkg,
          returnTo: returnToParam?.startsWith('/user/')
            ? returnToParam
            : `${paths.user.packagesExtra}?assignPremium=1`,
        });
        setLoading(false);
        return;
      }

      if (kind === 'okazion' && packageId) {
        const { packages: pkgs, error: err } = await listOkazionPackages();
        if (cancelled) return;
        if (err) {
          setError(err);
          setLoading(false);
          return;
        }
        const pkg = (pkgs ?? []).find((p) => p.id === packageId);
        if (!pkg) {
          setError('Paketa OKAZION nuk u gjet.');
          setLoading(false);
          return;
        }
        const qty = Math.min(50, Math.max(1, Math.floor(Number(quantityRaw) || 1)));
        setCheckout({
          kind: 'okazion',
          pkg,
          quantity: qty,
          returnTo: returnToParam?.startsWith('/user/')
            ? returnToParam
            : `${paths.user.packagesExtra}?assignOkazion=1`,
        });
        setLoading(false);
        return;
      }

      if (kind === 'subscription' && contractId && monthsRaw) {
        const months = Number(monthsRaw);
        if (!Number.isFinite(months) || months <= 0) {
          setError('Kohëzgjatja e abonimit nuk është e vlefshme.');
          setLoading(false);
          return;
        }
        const { contracts, error: err } = await listPublicContracts();
        if (cancelled) return;
        if (err) {
          setError(err);
          setLoading(false);
          return;
        }
        const contract = (contracts ?? []).find((c) => c.id === contractId);
        const option = contract?.priceOptions?.find((o) => o.months === months);
        if (!contract || !option) {
          setError('Plani nuk u gjet.');
          setLoading(false);
          return;
        }
        setCheckout({
          kind: 'subscription',
          contract,
          months: option.months,
          price: option.price,
          labelSq: option.labelSq,
          returnTo,
        });
        setLoading(false);
        return;
      }

      setError('Mungojnë parametrat e pagesës.');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, packageId, contractId, monthsRaw, quantityRaw, returnToParam]);

  const goBack = React.useCallback(() => {
    router.push(checkout?.returnTo || paths.user.credits);
  }, [checkout?.returnTo, router]);

  const title =
    checkout?.kind === 'subscription'
      ? 'Abonohu në plan'
      : checkout?.kind === 'auto-refresh'
        ? 'Abonohu në Auto-Refresh'
        : checkout?.kind === 'premium'
          ? 'Bli Premium'
          : checkout?.kind === 'okazion'
            ? 'Bli OKAZION'
            : 'Bli kredite';

  return (
    <Box sx={{ width: '100%' }}>
      {loading ? <CheckoutSkeleton /> : null}

      {error ? (
        <Stack spacing={2} sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
          <Alert severity="error" sx={{ borderRadius: 1.5 }}>
            {error}
          </Alert>
          <Button variant="outlined" onClick={goBack} sx={{ alignSelf: 'flex-start' }}>
            Kthehu te paketat
          </Button>
        </Stack>
      ) : null}

      {checkout && !loading && !error ? (
        <PokCheckoutView
          title={title}
          summary={
            checkout.kind === 'credits' ? (
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{ fontWeight: 800, letterSpacing: 0.6, color: 'primary.main', lineHeight: 1.2 }}
                  >
                    {checkout.pkg.labelSq}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.25, mt: 0.25 }}>
                    {formatBc(checkout.pkg.credits)} BC
                    {(checkout.pkg.bonusCredits || 0) > 0
                      ? ` + ${formatBc(checkout.pkg.bonusCredits)} bonus`
                      : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Totali: {formatBc(checkout.pkg.credits + (checkout.pkg.bonusCredits || 0))} BC
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', whiteSpace: 'nowrap', color: 'primary.main' }}>
                  <PackageEurPrice listPrice={checkout.pkg.priceEur} percent={lifetimePercent} />
                </Typography>
              </Stack>
            ) : checkout.kind === 'auto-refresh' ? (
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{ fontWeight: 800, letterSpacing: 0.6, color: 'primary.main', lineHeight: 1.2 }}
                  >
                    Auto-Refresh
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.25, mt: 0.25 }}>
                    {checkout.pkg.labelSq}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {checkout.pkg.slots} vende · abonim mujor · rifreskim automatik sipas planit
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', whiteSpace: 'nowrap', color: 'primary.main' }}>
                  <PackageEurPrice listPrice={checkout.pkg.priceEur} percent={lifetimePercent} />
                  <Typography component="span" variant="body2" sx={{ fontWeight: 700, ml: 0.25 }}>
                    /muaj
                  </Typography>
                </Typography>
              </Stack>
            ) : checkout.kind === 'premium' ? (
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{ fontWeight: 800, letterSpacing: 0.6, color: 'primary.main', lineHeight: 1.2 }}
                  >
                    Premium Listing
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.25, mt: 0.25 }}>
                    {checkout.pkg.labelSq}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {checkout.pkg.days} ditë · pastaj zgjidhni njoftimin
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', whiteSpace: 'nowrap', color: 'primary.main' }}>
                  <PackageEurPrice listPrice={checkout.pkg.priceEur} percent={lifetimePercent} />
                </Typography>
              </Stack>
            ) : checkout.kind === 'okazion' ? (
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{ fontWeight: 800, letterSpacing: 0.6, color: 'error.main', lineHeight: 1.2 }}
                  >
                    OKAZION
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.25, mt: 0.25 }}>
                    {checkout.quantity > 1
                      ? `${checkout.pkg.labelSq} ×${checkout.quantity}`
                      : checkout.pkg.labelSq}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {checkout.pkg.days} ditë për njoftim · stoko dhe apliko kur të duash
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', whiteSpace: 'nowrap', color: 'error.main' }}>
                  <PackageEurPrice
                    listPrice={checkout.pkg.priceEur * checkout.quantity}
                    percent={lifetimePercent}
                  />
                </Typography>
              </Stack>
            ) : (
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{ fontWeight: 800, letterSpacing: 0.6, color: 'primary.main', lineHeight: 1.2 }}
                  >
                    Abonim
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.25, mt: 0.25 }}>
                    {checkout.contract.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {checkout.labelSq} · {checkout.months} muaj
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', whiteSpace: 'nowrap', color: 'primary.main' }}>
                  <PackageEurPrice listPrice={checkout.price} percent={lifetimePercent} />
                </Typography>
              </Stack>
            )
          }
          createOrder={() =>
            checkout.kind === 'credits'
              ? createCreditsOrder(checkout.pkg.id)
              : checkout.kind === 'auto-refresh'
                ? createAutoRefreshOrder(checkout.pkg.id)
                : checkout.kind === 'premium'
                  ? createPremiumOrder(checkout.pkg.id)
                  : checkout.kind === 'okazion'
                    ? createOkazionOrder(checkout.pkg.id, checkout.quantity)
                    : createSubscriptionOrder(checkout.contract.id, checkout.months)
          }
          onPaid={() => {
            void checkSession();
          }}
          onDone={goBack}
        />
      ) : null}
    </Box>
  );
}
