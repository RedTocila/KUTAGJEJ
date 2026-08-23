'use client';

import * as React from 'react';
import { alpha } from '@mui/material/styles';
import { Alert, Box, Button, Divider, Skeleton, Stack, Typography } from '@mui/material';
import { ChartLine as ChartLineIcon } from '@phosphor-icons/react/dist/ssr/ChartLine';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { AiUsageChart } from '@/components/user/ai-usage-chart';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { PortalSectionCard } from '@/components/user/portal-cards';
import { formatBc } from '@/components/user/packages/package-ui';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { useUser } from '@/hooks/use-user';
import { fetchAiUsage, type AiUsageEvent } from '@/lib/ai-import-client';

function PriceRow({
  title,
  amount,
  free,
  freeLabel,
}: {
  title: string;
  amount?: number;
  free?: boolean;
  freeLabel: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', py: 0.85 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', letterSpacing: '-0.01em' }}>{title}</Typography>
      {free ? (
        <Typography sx={{ fontWeight: 750, fontSize: '0.88rem', color: 'text.secondary' }}>{freeLabel}</Typography>
      ) : (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <BoostCoinIcon size={14} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: 'warning.main' }}>
            {formatBc(amount ?? 0)} BC
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}

export default function AiUsagePage() {
  const t = useCopy();
  const { user } = useUser();
  const { language } = useLanguage();
  const dateLocale = language === 'en' ? 'en-GB' : 'sq-AL';
  const sessionBalance = Math.max(0, Math.round((Number(user?.boostCredits) || 0) * 10) / 10);
  const [events, setEvents] = React.useState<AiUsageEvent[]>([]);
  const [balance, setBalance] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [range, setRange] = React.useState<7 | 30>(7);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAiUsage();
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEvents(res.snapshot?.events ?? []);
    setBalance(res.snapshot?.balance ?? 0);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const displayBalance = balance ?? (user ? sessionBalance : null);

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 640, mx: 'auto', width: '100%' }}>
      <UserPageHeader
        icon={<SparkleIcon size={22} weight="duotone" />}
        title={t.aiUsage.title}
        description={t.aiUsage.description}
      />

      {error ? (
        <Alert
          severity="warning"
          sx={{ borderRadius: 2.5 }}
          action={
            <Button color="inherit" size="small" onClick={() => void load()} sx={{ fontWeight: 800, textTransform: 'none' }}>
              {t.aiUsage.retry}
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      <PortalSectionCard
        title={t.aiUsage.historyTitle}
        icon={<ChartLineIcon size={22} weight="duotone" />}
        headerExtra={
          displayBalance != null ? (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                alignItems: 'center',
                px: 1,
                py: 0.4,
                borderRadius: 999,
                bgcolor: (theme) =>
                  alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
              }}
            >
              <BoostCoinIcon size={14} />
              <Typography sx={{ fontWeight: 800, fontSize: '0.78rem', color: 'warning.main' }}>
                {formatBc(displayBalance)}
              </Typography>
            </Stack>
          ) : null
        }
      >
        {loading ? (
          <Stack spacing={1.5} aria-busy>
            <Skeleton variant="rounded" height={36} width={140} sx={{ borderRadius: 1.5 }} />
            <Skeleton variant="rounded" height={176} sx={{ borderRadius: 2.25 }} />
            <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2.25 }} />
          </Stack>
        ) : (
          <AiUsageChart
            events={events}
            range={range}
            onRangeChange={setRange}
            locale={dateLocale}
            copy={t.aiUsage}
          />
        )}
      </PortalSectionCard>

      <PortalSectionCard title={t.aiUsage.ratesTitle}>
        <Box>
          <PriceRow title={t.aiUsage.aiBuild} amount={1} freeLabel={t.aiUsage.free} />
          <Divider />
          <PriceRow title={t.aiUsage.aiAssist} amount={0.5} freeLabel={t.aiUsage.free} />
          <Divider />
          <PriceRow title={t.aiUsage.aiMenu} amount={1} freeLabel={t.aiUsage.free} />
          <Divider />
          <PriceRow title={t.aiUsage.aiSearch} free freeLabel={t.aiUsage.free} />
        </Box>
      </PortalSectionCard>
    </Stack>
  );
}
