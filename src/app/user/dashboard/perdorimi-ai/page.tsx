'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { alpha } from '@mui/material/styles';
import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { ContentBlockSkeleton } from '@/components/core/content-skeletons';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { PortalIconBox, PortalSectionCard } from '@/components/user/portal-cards';
import { formatBc } from '@/components/user/packages/package-ui';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { fetchAiUsage, type AiUsageEvent, type AiUsageKind } from '@/lib/ai-import-client';
import { paths } from '@/paths';

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function kindLabel(t: ReturnType<typeof useCopy>, kind: AiUsageKind): string {
  if (kind === 'ai_build') return t.aiUsage.aiBuild;
  if (kind === 'ai_menu') return t.aiUsage.aiMenu;
  return t.aiUsage.aiAssist;
}

function iconForKind(kind: AiUsageKind): PhosphorIcon {
  if (kind === 'ai_build') return LinkSimpleIcon;
  if (kind === 'ai_menu') return SparkleIcon;
  return PencilSimpleIcon;
}

function PricePill({
  amount,
  free,
  freeLabel,
}: {
  amount?: number;
  free?: boolean;
  freeLabel: string;
}) {
  if (free) {
    return (
      <Box
        sx={{
          px: 1.35,
          py: 0.7,
          borderRadius: 999,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', lineHeight: 1 }}>
          {freeLabel}
        </Typography>
      </Box>
    );
  }
  return (
    <Stack
      direction="row"
      spacing={0.6}
      sx={{
        alignItems: 'center',
        px: 1.35,
        py: 0.7,
        borderRadius: 999,
        bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.18 : 0.12),
        flexShrink: 0,
      }}
    >
      <BoostCoinIcon size={16} />
      <Typography sx={{ fontWeight: 850, fontSize: '0.88rem', lineHeight: 1, color: 'warning.main' }}>
        {formatBc(amount ?? 0)} BC
      </Typography>
    </Stack>
  );
}

function RateRow({
  icon: Icon,
  title,
  detail,
  amount,
  free,
  freeLabel,
}: {
  icon: PhosphorIcon;
  title: string;
  detail: string;
  amount?: number;
  free?: boolean;
  freeLabel: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 0.35 }}>
      <PortalIconBox size={42}>
        <Icon size={20} weight="duotone" />
      </PortalIconBox>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.98rem', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, lineHeight: 1.4 }}>
          {detail}
        </Typography>
      </Box>
      <PricePill amount={amount} free={free} freeLabel={freeLabel} />
    </Stack>
  );
}

export default function AiUsagePage() {
  const t = useCopy();
  const { language } = useLanguage();
  const dateLocale = language === 'en' ? 'en-GB' : 'sq-AL';
  const [events, setEvents] = React.useState<AiUsageEvent[]>([]);
  const [balance, setBalance] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchAiUsage();
      if (cancelled) return;
      setLoading(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setEvents(res.snapshot?.events ?? []);
      setBalance(res.snapshot?.balance ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 640, mx: 'auto', width: '100%' }}>
      <UserPageHeader
        icon={<SparkleIcon size={22} weight="duotone" />}
        title={t.aiUsage.title}
        description={t.aiUsage.description}
        action={
          <Button
            component={RouterLink}
            href={paths.user.packagesCredits}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2, whiteSpace: 'nowrap' }}
          >
            {t.aiUsage.buyCoins}
          </Button>
        }
      />

      {error ? (
        <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
          {error}
        </Alert>
      ) : null}

      <PortalSectionCard
        title={t.aiUsage.ratesTitle}
        icon={<SparkleIcon size={22} weight="duotone" />}
        headerExtra={
          balance != null ? (
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
                {formatBc(balance)}
              </Typography>
            </Stack>
          ) : null
        }
      >
        <Stack spacing={1.75}>
          <RateRow
            icon={LinkSimpleIcon}
            title={t.aiUsage.aiBuild}
            detail={t.aiUsage.aiBuildDetail}
            amount={1}
            freeLabel={t.aiUsage.free}
          />
          <Divider />
          <RateRow
            icon={PencilSimpleIcon}
            title={t.aiUsage.aiAssist}
            detail={t.aiUsage.aiAssistDetail}
            amount={0.5}
            freeLabel={t.aiUsage.free}
          />
          <Divider />
          <RateRow
            icon={MagnifyingGlassIcon}
            title={t.aiUsage.aiSearch}
            detail={t.aiUsage.aiSearchDetail}
            free
            freeLabel={t.aiUsage.free}
          />
        </Stack>
      </PortalSectionCard>

      <PortalSectionCard title={t.aiUsage.historyTitle} icon={<SparkleIcon size={22} weight="duotone" />}>
        {loading ? (
          <ContentBlockSkeleton rows={4} rowHeight={64} />
        ) : events.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 0.25, py: 0.5 }}>
            {t.aiUsage.empty}
          </Typography>
        ) : (
          <Stack spacing={1.1}>
            {events.map((row) => {
              const Icon = iconForKind(row.kind);
              return (
                <Box
                  key={row.id}
                  sx={{
                    p: 1.6,
                    borderRadius: 2.25,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
                  }}
                >
                  <Stack direction="row" spacing={1.35} sx={{ alignItems: 'center' }}>
                    <PortalIconBox size={40}>
                      <Icon size={18} weight="duotone" />
                    </PortalIconBox>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: '0.92rem', lineHeight: 1.3 }}>
                            {kindLabel(t, row.kind)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                            {formatDate(row.createdAt, dateLocale)}
                            {row.units > 1 ? ` · ×${row.units}` : ''}
                            {row.status === 'refunded' ? ` · ${t.aiUsage.refunded}` : ''}
                          </Typography>
                        </Box>
                        <PricePill
                          amount={row.costBc}
                          free={row.status === 'refunded'}
                          freeLabel={t.aiUsage.refunded}
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </PortalSectionCard>
    </Stack>
  );
}
