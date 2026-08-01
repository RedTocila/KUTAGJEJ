'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';

import { useUser } from '@/hooks/use-user';
import { createCreditsOrder, listCreditPackages } from '@/lib/payments-client';
import type { CreditPackage } from '@/types/payment';
import { PokCheckoutDialog } from '@/components/payments/pok-checkout-dialog';

function formatBc(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

function bonusLabel(bonus: number) {
  if (bonus <= 0) return 'Bonus 0';
  return `Bonus +${formatBc(bonus)} BC`;
}

export function BuyBoostCreditsPanel({ showHeader = true }: { showHeader?: boolean }) {
  const { user, checkSession } = useUser();
  const [packages, setPackages] = React.useState<CreditPackage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<CreditPackage | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { packages: pkgs, error: err } = await listCreditPackages();
      if (cancelled) return;
      if (err) setError(err);
      else setPackages(pkgs ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const balance = typeof user?.boostCredits === 'number' ? user.boostCredits : 0;

  return (
    <Stack spacing={3}>
      {showHeader ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <CoinsIcon size={28} weight="duotone" color="var(--mui-palette-warning-main)" />
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
                BOOST CREDIT
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
            Zgjidhni një paketë për të promovuar njoftimet tuaja.
          </Typography>
          <BalanceChip balance={balance} />
        </Stack>
      )}

      {error ? (
        <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {packages.map((pkg) => {
            const bonus = Number(pkg.bonusCredits) || 0;
            const total = Number(pkg.credits) + bonus;
            return (
              <Grid key={pkg.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box
                  sx={{
                    position: 'relative',
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: bonus > 0 ? (t) => `${t.palette.warning.main}66` : 'divider',
                    bgcolor: 'background.paper',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.25,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 12px 26px rgba(0,0,0,0.12)',
                    },
                  }}
                >
                  {pkg.badgeSq ? (
                    <Chip
                      size="small"
                      color="warning"
                      label={pkg.badgeSq}
                      sx={{ position: 'absolute', top: 12, right: 12, fontWeight: 700 }}
                    />
                  ) : null}

                  <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', pr: pkg.badgeSq ? 8 : 0 }}>
                    {pkg.labelSq}
                  </Typography>

                  <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', lineHeight: 1.1 }}>
                    €{pkg.priceEur}
                  </Typography>

                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatBc(pkg.credits)} BC
                    </Typography>
                    <Typography
                      variant="body2"
                      color={bonus > 0 ? 'warning.main' : 'text.secondary'}
                      sx={{ fontWeight: bonus > 0 ? 700 : 500 }}
                    >
                      {bonusLabel(bonus)}
                    </Typography>
                    {bonus > 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        Totali: {formatBc(total)} BC
                      </Typography>
                    ) : null}
                  </Stack>

                  <Button
                    variant="contained"
                    onClick={() => setSelected(pkg)}
                    sx={{ fontWeight: 700, mt: 'auto' }}
                  >
                    Blej
                  </Button>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}

      {selected ? (
        <PokCheckoutDialog
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          title="Bli kredite"
          summary={
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                  {selected.labelSq}
                </Typography>
                <Typography sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                  {formatBc(selected.credits)} BC
                  {(selected.bonusCredits || 0) > 0
                    ? ` + ${formatBc(selected.bonusCredits)} bonus`
                    : ''}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Totali: {formatBc(selected.credits + (selected.bonusCredits || 0))} BC
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', whiteSpace: 'nowrap' }}>
                €{selected.priceEur}
              </Typography>
            </Stack>
          }
          createOrder={() => createCreditsOrder(selected.id)}
          onPaid={() => {
            void checkSession();
          }}
        />
      ) : null}
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
        borderRadius: 999,
        border: '1px solid',
        borderColor: (t) => `${t.palette.warning.main}55`,
        bgcolor: (t) => `${t.palette.warning.main}14`,
        color: 'warning.main',
      }}
    >
      <CoinsIcon size={22} weight="duotone" />
      <Typography component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
        Balanca
      </Typography>
      <Typography component="span" sx={{ fontWeight: 800 }}>
        {formatBc(balance)}
      </Typography>
    </Stack>
  );
}
