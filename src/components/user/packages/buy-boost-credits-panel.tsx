'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';

import { useUser } from '@/hooks/use-user';
import { listCreditPackages } from '@/lib/payments-client';
import type { CreditPackage } from '@/types/payment';
import { paths } from '@/paths';
import {
  FeatureList,
  PlanCard,
  PlanCardHeader,
  PlanPrice,
  SoftChip,
  accentButtonSx,
  formatBc,
  formatEur,
  type PlanAccent,
} from './package-ui';

/** Always-visible catalog when the API has no active rows yet. */
const FALLBACK_CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'Starter', credits: 100, bonusCredits: 0, priceEur: 9, labelSq: 'Starter' },
  { id: 'Growth', credits: 300, bonusCredits: 40, priceEur: 27, labelSq: 'Growth', badgeSq: '+40 BC' },
  { id: 'Pro', credits: 800, bonusCredits: 200, priceEur: 75, labelSq: 'Pro', badgeSq: '+200 BC' },
  { id: 'Elite', credits: 2000, bonusCredits: 500, priceEur: 180, labelSq: 'Elite', badgeSq: '+500 BC' },
  { id: 'Competitor', credits: 4000, bonusCredits: 900, priceEur: 360, labelSq: 'Competitor', badgeSq: '+900 BC' },
  { id: 'Dominator', credits: 8000, bonusCredits: 1500, priceEur: 750, labelSq: 'Dominator', badgeSq: '+1500 BC' },
];

/** Card / chip accent per package. Starter & Elite keep the orange look. */
const CREDIT_PACKAGE_ACCENT: Record<string, PlanAccent> = {
  starter: 'warning',
  growth: '#3b82f6',
  pro: '#2dd4bf',
  elite: 'warning',
  competitor: 'error',
  dominator: '#a855f7',
};

/** Buy button accent — Starter uses green; others match the card. */
const CREDIT_PACKAGE_BUTTON_ACCENT: Record<string, PlanAccent> = {
  starter: 'success',
  growth: '#3b82f6',
  pro: '#2dd4bf',
  elite: 'warning',
  competitor: 'error',
  dominator: '#a855f7',
};

function packageKey(pkg: CreditPackage) {
  return String(pkg.labelSq || pkg.id || '')
    .trim()
    .toLowerCase();
}

function accentForPackage(pkg: CreditPackage): PlanAccent {
  return CREDIT_PACKAGE_ACCENT[packageKey(pkg)] ?? 'warning';
}

function buttonAccentForPackage(pkg: CreditPackage): PlanAccent {
  return CREDIT_PACKAGE_BUTTON_ACCENT[packageKey(pkg)] ?? accentForPackage(pkg);
}

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

export function BuyBoostCreditsPanel({ showHeader = true }: { showHeader?: boolean }) {
  const router = useRouter();
  const { user } = useUser();
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

  const balance = Math.max(0, Math.floor(Number(user?.boostCredits) || 0));

  return (
    <Stack spacing={2.5}>
      {showHeader ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <CoinsIcon size={28} weight="duotone" color="var(--mui-palette-warning-main)" />
              <Typography variant="h4" component="h1" sx={{ fontWeight: 850 }}>
                Boost Coins
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Zgjidhni një paketë për të promovuar njoftimet tuaja.
            </Typography>
          </Box>
          <BalanceChip balance={balance} />
        </Stack>
      ) : (
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Sa më e madhe paketa, aq më shumë Boost Coins (dhe bonus).
          </Typography>
          <BalanceChip balance={balance} />
        </Stack>
      )}

      {error ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {error}
          {usingFallback ? ' Po shfaqen paketat standarde.' : ''}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Grid container spacing={1.5}>
          {packages.map((pkg, index) => {
            const bonus = Number(pkg.bonusCredits) || 0;
            const total = Number(pkg.credits) + bonus;
            const accent = accentForPackage(pkg);
            const buttonAccent = buttonAccentForPackage(pkg);
            const highlighted = Boolean(pkg.badgeSq) || index === 2;
            return (
              <Grid key={pkg.id} size={{ xs: 6, sm: 6, md: 4 }}>
                <PlanCard highlighted={highlighted} accent={accent} compact>
                  <PlanCardHeader
                    compact
                    title={pkg.labelSq}
                    accent={accent}
                    badge={
                      pkg.badgeSq ? (
                        <SoftChip compact label={pkg.badgeSq} accent={accent} />
                      ) : highlighted ? (
                        <SoftChip compact label="Popullore" accent={accent} />
                      ) : undefined
                    }
                  />

                  <PlanPrice
                    compact
                    amount={formatBc(total)}
                    suffix="BC"
                    hint={formatEur(pkg.priceEur)}
                  />

                  <FeatureList
                    compact
                    accent={accent}
                    items={
                      bonus > 0
                        ? [`${formatBc(pkg.credits)} BC bazë`, `+${formatBc(bonus)} bonus`]
                        : ['Pa bonus']
                    }
                  />

                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    onClick={() => router.push(checkoutCreditsHref(pkg.id))}
                    sx={{
                      ...accentButtonSx(buttonAccent),
                      mt: 'auto',
                      borderRadius: 1.75,
                      py: 0.85,
                      fontSize: '0.8rem',
                      minWidth: 0,
                      // Light accents need dark label text for contrast.
                      color:
                        buttonAccent === 'warning' || buttonAccent === '#2dd4bf' ? '#0b1220' : '#fff',
                    }}
                  >
                    Blej {formatEur(pkg.priceEur)}
                  </Button>
                </PlanCard>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Stack>
  );
}

function BalanceChip({ balance }: { balance: number }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: 'center',
        px: 1.75,
        py: 0.85,
        borderRadius: 2,
        border: '1px solid',
        borderColor: (t) => `${t.palette.warning.main}55`,
        bgcolor: (t) => `${t.palette.warning.main}14`,
        color: 'warning.main',
      }}
    >
      <CoinsIcon size={20} weight="duotone" />
      <Typography component="span" sx={{ color: 'text.primary', fontWeight: 650, fontSize: '0.85rem' }}>
        Balanca
      </Typography>
      <Typography component="span" sx={{ fontWeight: 850 }}>
        {formatBc(balance)} BC
      </Typography>
    </Stack>
  );
}
