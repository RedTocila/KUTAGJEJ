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
import { alpha } from '@mui/material/styles';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { useUser } from '@/hooks/use-user';
import { listCreditPackages } from '@/lib/payments-client';
import type { CreditPackage } from '@/types/payment';
import { paths } from '@/paths';
import {
  SoftChip,
  accentButtonSx,
  formatBc,
  formatEur,
  resolveAccent,
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

/** Shared accent for every Boost Coins package row. */
const PACKAGE_ACCENT: PlanAccent = 'primary';

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
              <BoostCoinIcon size={28} />
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
        <Stack spacing={1.15}>
          {packages.map((pkg, index) => {
            const bonus = Number(pkg.bonusCredits) || 0;
            const total = Number(pkg.credits) + bonus;
            const highlighted = Boolean(pkg.badgeSq) || index === 2;
            const detailItems =
              bonus > 0
                ? [`${formatBc(pkg.credits)} BC bazë`, `+${formatBc(bonus)} bonus`]
                : ['Pa bonus'];

            return (
              <Box
                key={pkg.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: { xs: 1.25, sm: 2 },
                  px: { xs: 1.5, sm: 1.75 },
                  py: { xs: 1.35, sm: 1.5 },
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: highlighted
                    ? (t) => alpha(resolveAccent(t, PACKAGE_ACCENT), 0.55)
                    : 'divider',
                  bgcolor: 'background.paper',
                  boxShadow: highlighted
                    ? (t) => `0 8px 22px ${alpha(resolveAccent(t, PACKAGE_ACCENT), 0.12)}`
                    : 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': {
                    borderColor: (t) => alpha(resolveAccent(t, PACKAGE_ACCENT), 0.45),
                    boxShadow: (t) => `0 8px 22px ${alpha(t.palette.common.black, 0.08)}`,
                  },
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 0.35 }}
                  >
                    <Typography sx={{ fontWeight: 850, fontSize: '0.95rem', lineHeight: 1.25 }}>
                      {pkg.labelSq}
                    </Typography>
                    {pkg.badgeSq ? (
                      <SoftChip compact label={pkg.badgeSq} accent={PACKAGE_ACCENT} />
                    ) : highlighted ? (
                      <SoftChip compact label="Popullore" accent={PACKAGE_ACCENT} />
                    ) : null}
                  </Stack>

                  <Stack direction="row" spacing={0.85} sx={{ alignItems: 'baseline', mb: 0.45 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: { xs: '1.15rem', sm: '1.25rem' },
                        lineHeight: 1.15,
                        letterSpacing: '-0.02em',
                        color: (t) => resolveAccent(t, PACKAGE_ACCENT),
                      }}
                    >
                      {formatBc(total)}
                    </Typography>
                    <Typography
                      sx={{ fontWeight: 750, fontSize: '0.78rem', color: 'text.secondary' }}
                    >
                      BC
                    </Typography>
                    <Typography
                      sx={{ fontWeight: 650, fontSize: '0.78rem', color: 'text.secondary' }}
                    >
                      · {formatEur(pkg.priceEur)}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1.25} sx={{ flexWrap: 'wrap', rowGap: 0.25 }}>
                    {detailItems.map((item) => (
                      <Stack
                        key={item}
                        direction="row"
                        spacing={0.4}
                        sx={{
                          alignItems: 'center',
                          color: (t) => resolveAccent(t, PACKAGE_ACCENT),
                        }}
                      >
                        <CheckCircleIcon size={13} weight="fill" />
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 650, color: 'text.secondary', fontSize: '0.7rem' }}
                        >
                          {item}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>

                <Button
                  variant="contained"
                  size="small"
                  onClick={() => router.push(checkoutCreditsHref(pkg.id))}
                  sx={{
                    ...accentButtonSx(PACKAGE_ACCENT),
                    flexShrink: 0,
                    borderRadius: 1.75,
                    px: { xs: 1.5, sm: 2 },
                    py: 0.95,
                    minWidth: { xs: 92, sm: 110 },
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    textTransform: 'none',
                  }}
                >
                  {formatEur(pkg.priceEur)}
                </Button>
              </Box>
            );
          })}
        </Stack>
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
      <BoostCoinIcon size={20} />
      <Typography component="span" sx={{ color: 'text.primary', fontWeight: 650, fontSize: '0.85rem' }}>
        Balanca
      </Typography>
      <Typography component="span" sx={{ fontWeight: 850 }}>
        {formatBc(balance)} BC
      </Typography>
    </Stack>
  );
}
