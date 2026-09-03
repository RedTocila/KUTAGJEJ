'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { PackageRowsSkeleton } from '@/components/core/content-skeletons';
import { useCopy } from '@/hooks/use-copy';
import { useLifetimePackageDiscount } from '@/hooks/use-lifetime-package-discount';
import { useUser } from '@/hooks/use-user';
import { listCreditPackages } from '@/lib/payments-client';
import type { CreditPackage } from '@/types/payment';
import { paths } from '@/paths';
import { PackageCheckoutCard, PackageEurPrice, ReferralDiscountNote, formatBc } from './package-ui';

/** Always-visible catalog when the API has no active rows yet. */
const FALLBACK_CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'Starter', credits: 100, bonusCredits: 0, priceEur: 9, labelSq: 'Starter' },
  { id: 'Growth', credits: 300, bonusCredits: 40, priceEur: 27, labelSq: 'Growth', badgeSq: '+40 BC' },
  { id: 'Pro', credits: 800, bonusCredits: 200, priceEur: 75, labelSq: 'Pro', badgeSq: '+200 BC' },
  { id: 'Elite', credits: 2000, bonusCredits: 500, priceEur: 180, labelSq: 'Elite', badgeSq: '+500 BC' },
  { id: 'Competitor', credits: 4000, bonusCredits: 900, priceEur: 360, labelSq: 'Competitor', badgeSq: '+900 BC' },
  { id: 'Dominator', credits: 8000, bonusCredits: 1500, priceEur: 750, labelSq: 'Dominator', badgeSq: '+1500 BC' },
];

function checkoutCreditsHref(packageId: string) {
  const q = new URLSearchParams({
    kind: 'credits',
    packageId,
    returnTo: paths.user.packagesCredits,
  });
  return `${paths.user.checkout}?${q.toString()}`;
}

function mergeCatalog(apiPackages: CreditPackage[]): CreditPackage[] {
  if (apiPackages.length > 0) return apiPackages;
  return FALLBACK_CREDIT_PACKAGES;
}

function packageSubtitle(pkg: CreditPackage): string {
  const bonus = Number(pkg.bonusCredits) || 0;
  const base = Number(pkg.credits) || 0;
  const total = base + bonus;
  if (bonus > 0) {
    return `${formatBc(total)} BC · ${formatBc(base)} + ${formatBc(bonus)} bonus`;
  }
  return `${formatBc(total)} BC`;
}

export function BuyBoostCreditsPanel({ showHeader = true }: { showHeader?: boolean }) {
  const router = useRouter();
  const t = useCopy();
  const { user } = useUser();
  const lifetimePercent = useLifetimePackageDiscount();
  const [packages, setPackages] = React.useState<CreditPackage[]>(FALLBACK_CREDIT_PACKAGES);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [usingFallback, setUsingFallback] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { packages: pkgs, error: err } = await listCreditPackages();
      if (cancelled) return;
      const merged = mergeCatalog(pkgs ?? []);
      setPackages(merged);
      setUsingFallback(!(pkgs && pkgs.length > 0));
      if (err && !(pkgs && pkgs.length > 0)) setError(err);
      else setError(null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const balance = Math.max(0, Math.round((Number(user?.boostCredits) || 0) * 10) / 10);

  return (
    <Stack spacing={2.5} sx={{ pb: { xs: 12, md: 2 } }}>
      {showHeader ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <BoostCoinIcon size={28} />
              <Typography variant="h4" component="h1" sx={{ fontWeight: 850 }}>
                Boost Coins
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {t.packages.boostCoinsDescription}
            </Typography>
          </Box>
          <BalanceChip balance={balance} label={t.packages.balance} />
        </Stack>
      ) : (
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}
        >
          <Typography variant="body2" color="text.secondary">
            {t.packages.boostCoinsBigger}
          </Typography>
          <BalanceChip balance={balance} label={t.packages.balance} />
        </Stack>
      )}

      {error ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {error}
          {usingFallback ? t.packages.fallbackCatalog : ''}
        </Alert>
      ) : null}

      {loading ? (
        <PackageRowsSkeleton count={6} />
      ) : (
        <Stack spacing={1.75}>
          <ReferralDiscountNote percent={lifetimePercent} />
          {packages.map((pkg) => {
            const bonus = Number(pkg.bonusCredits) || 0;
            const badge = pkg.badgeSq || (bonus > 0 ? `+${formatBc(bonus)} BC` : null);
            return (
              <PackageCheckoutCard
                key={pkg.id}
                icon={BoostCoinIcon}
                accent="warning"
                title={pkg.labelSq}
                subtitle={packageSubtitle(pkg)}
                badge={badge}
                compactPrice
                price={<PackageEurPrice listPrice={pkg.priceEur} percent={lifetimePercent} />}
                onClick={() => router.push(checkoutCreditsHref(pkg.id))}
              />
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}

function BalanceChip({ balance, label }: { balance: number; label: string }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: 'center',
        px: 1.75,
        py: 0.85,
        borderRadius: 999,
        border: 'none',
        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.18),
        color: 'warning.main',
      }}
    >
      <BoostCoinIcon size={20} />
      <Typography component="span" sx={{ color: 'text.primary', fontWeight: 650, fontSize: '0.85rem' }}>
        {label}
      </Typography>
      <Typography component="span" sx={{ fontWeight: 850 }}>
        {formatBc(balance)} BC
      </Typography>
    </Stack>
  );
}
