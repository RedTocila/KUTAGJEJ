'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { Copy as CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { UsersThree as UsersThreeIcon } from '@phosphor-icons/react/dist/ssr/UsersThree';

import { ProgramDisplay } from '@/components/dashboard/referral/referral-program-display';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { PortalSurface } from '@/components/user/portal-cards';
import { ShareMyListingsDialog } from '@/components/user/share-my-listings-dialog';
import { useUser } from '@/hooks/use-user';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { formatRatingDisplay } from '@/lib/format-rating';
import { fetchMyReferralStats } from '@/lib/referrals-client';
import type { ReferralProgram } from '@/types/referral-program';
import type { MyReferralStats } from '@/types/referrals';
import { paths } from '@/paths';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('sq-AL', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        px: 1.25,
        py: 1.15,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650, fontSize: '0.68rem' }}>
        {label}
      </Typography>
    </Box>
  );
}

export function UserReferralView() {
  const router = useRouter();
  const { user } = useUser();
  const [stats, setStats] = React.useState<MyReferralStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [copyMsg, setCopyMsg] = React.useState<string | null>(null);
  const [program, setProgram] = React.useState<ReferralProgram | undefined>(undefined);
  const [sharePickerOpen, setSharePickerOpen] = React.useState(false);

  const canView =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchMyReferralStats();
    if (res.error) {
      setError(res.error);
      setStats(null);
    } else {
      setStats(res.referral ?? null);
      setProgram(res.program);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!user) return;
    if (!canView) {
      router.replace(paths.user.dashboard);
      return;
    }
    void load();
  }, [user, canView, router, load]);

  if (!user || !canView) return null;

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyText(text);
    setCopyMsg(ok ? `${label} u kopjua.` : 'Kopjimi dështoi.');
    setTimeout(() => setCopyMsg(null), 2500);
  };

  const next = stats?.nextTier ?? null;
  const nextProgress =
    next && next.referralsRequired > 0
      ? Math.min(100, Math.round((stats!.referralCount / next.referralsRequired) * 100))
      : 100;

  return (
    <Stack spacing={1.75} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
      <UserPageHeader
        icon={<HandshakeIcon size={20} weight="duotone" />}
        title="Referimi"
        description="Ndani linkun → miqtë regjistrohen → ju fitoni Boost Coins."
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {copyMsg ? <Alert severity="success" onClose={() => setCopyMsg(null)}>{copyMsg}</Alert> : null}

      {loading ? (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3.5 }} />
          <Skeleton variant="rounded" height={88} sx={{ borderRadius: 2.5 }} />
        </Stack>
      ) : stats ? (
        <>
          {/* Invite hub */}
          <PortalSurface>
            <Box
              sx={{
                px: { xs: 2.25, sm: 2.75 },
                py: 1.85,
                background: (t) =>
                  `linear-gradient(135deg, ${primaryMainAlpha(0.22)} 0%, ${
                    t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
                  } 100%)`,
              }}
            >
              <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 0.6, color: 'text.secondary' }}>
                Linku i ftesës
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 900, fontSize: '1.35rem', letterSpacing: '0.06em' }}>
                  {stats.code}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Kopjo kodin"
                  onClick={() => void handleCopy(stats.code, 'Kodi')}
                  sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
                >
                  <CopyIcon size={16} />
                </IconButton>
              </Stack>
            </Box>

            <Stack spacing={1.5} sx={{ px: { xs: 2.25, sm: 2.75 }, py: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<LinkSimpleIcon size={18} weight="bold" />}
                  onClick={() => void handleCopy(stats.link, 'Linku')}
                  sx={{ fontWeight: 800, borderRadius: 2.5, py: 1.15, textTransform: 'none' }}
                >
                  Kopjo linkun
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CopyIcon size={16} />}
                  onClick={() => void handleCopy(stats.code, 'Kodi')}
                  sx={{ fontWeight: 750, borderRadius: 2.5, py: 1.15, textTransform: 'none' }}
                >
                  Kopjo kodin
                </Button>
              </Stack>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  wordBreak: 'break-all',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '0.68rem',
                }}
              >
                {stats.link}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <StatPill label="Referime" value={stats.referralCount} />
                <StatPill label="Të paguara" value={stats.paidReferralCount} />
                <StatPill
                  label="Vlerësimi"
                  value={stats.ratingAverage != null ? formatRatingDisplay(stats.ratingAverage) : '—'}
                />
                <StatPill label="Boost Coins" value={stats.boostCredits} />
              </Stack>

              {next ? (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'primary.light',
                    bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.12 : 0.08),
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      Hapi tjetër: {next.title}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>
                      +{next.boostCredits} BC
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={nextProgress}
                    sx={{ height: 6, borderRadius: 3, mb: 0.5 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Edhe <strong>{next.remaining}</strong> referim{next.remaining === 1 ? '' : 'e'} deri te niveli
                    ({stats.referralCount}/{next.referralsRequired})
                  </Typography>
                </Box>
              ) : (
                <Alert severity="success" sx={{ py: 0.5 }}>
                  Keni arritur të gjitha nivelet aktuale të referimit falas.
                </Alert>
              )}

              {stats.referredBy ? (
                <Typography variant="caption" color="text.secondary">
                  Ju u referuat nga <strong>{stats.referredBy.displayName}</strong>
                </Typography>
              ) : null}
            </Stack>
          </PortalSurface>

          {/* Referred people — compact */}
          <PortalSurface>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                px: { xs: 2.25, sm: 2.75 },
                py: 1.35,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <UsersThreeIcon size={18} weight="duotone" color="var(--mui-palette-primary-main)" />
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', flex: 1 }}>Të referuarit</Typography>
              <Chip size="small" label={stats.referredUsers.length} sx={{ height: 22, fontWeight: 800 }} />
            </Stack>

            {stats.referredUsers.length === 0 ? (
              <Box sx={{ px: 2.5, py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Ende askush. Kopjoni linkun dhe ftoni miqtë.
                </Typography>
              </Box>
            ) : (
              <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
                {stats.referredUsers.map((row) => (
                  <Stack
                    key={row.id}
                    direction="row"
                    spacing={1.25}
                    sx={{
                      alignItems: 'center',
                      px: { xs: 2.25, sm: 2.75 },
                      py: 1.2,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 750, lineHeight: 1.25 }} noWrap>
                        {row.referredUser?.displayName ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {row.referredUser?.email ?? '—'} · {formatDate(row.createdAt)}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: row.creditsAwarded > 0 ? 'success.main' : 'text.disabled',
                        flexShrink: 0,
                      }}
                    >
                      {row.creditsAwarded > 0 ? `+${row.creditsAwarded} BC` : '—'}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </PortalSurface>

          {/* All reward groups — always visible */}
          {program ? (
            <Stack spacing={1}>
              <Box sx={{ px: 0.25 }}>
                <Typography sx={{ fontWeight: 850, fontSize: '1rem' }}>Llojet e shpërblimeve</Typography>
                <Typography variant="caption" color="text.secondary">
                  5 grupe të ndryshme — çdo grup ka rregullat dhe progresin e vet.
                </Typography>
              </Box>
              <ProgramDisplay
                program={program}
                referralCount={stats.referralCount}
                paidReferralCount={stats.paidReferralCount}
                reviewCount={stats.reviewCount}
                dailyShareClaimedToday={Boolean(stats.dailyShareClaimedToday)}
                dailyShareBoostCredits={stats.dailyShareBoostCredits ?? 3}
                loginStreakDays={stats.loginStreakDays ?? 0}
                onShareClick={() => setSharePickerOpen(true)}
                compact
              />
            </Stack>
          ) : null}
        </>
      ) : null}

      <ShareMyListingsDialog
        open={sharePickerOpen}
        onClose={() => setSharePickerOpen(false)}
        onShareComplete={() => {
          void load();
        }}
      />
    </Stack>
  );
}
