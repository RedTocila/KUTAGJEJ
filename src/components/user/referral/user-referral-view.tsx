'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { Copy as CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { UsersThree as UsersThreeIcon } from '@phosphor-icons/react/dist/ssr/UsersThree';

import { ProgramDisplay } from '@/components/dashboard/referral/referral-program-display';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { PortalSurface } from '@/components/user/portal-cards';
import { ReferredUsersList } from '@/components/user/referral/referred-users-list';
import { useUser } from '@/hooks/use-user';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { formatRatingDisplay } from '@/lib/format-rating';
import { CANONICAL_SITE_ORIGIN, getPublicSiteOrigin } from '@/lib/get-site-url';
import { resolveNextReferralStep } from '@/lib/referral-next-step';
import { fetchMyReferralStats } from '@/lib/referrals-client';
import { productButtonSx } from '@/styles/product-sx';
import type { ReferralProgram } from '@/types/referral-program';
import type { MyReferralStats } from '@/types/referrals';
import { paths } from '@/paths';

const RECENT_REFERRALS_LIMIT = 5;

function formatCount(value: number): string {
  return value.toLocaleString('sq-AL');
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.35,
        borderRadius: 2.25,
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
        minWidth: 0,
      }}
    >
      <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', lineHeight: 1.15, letterSpacing: '-0.03em' }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650, fontSize: '0.72rem' }}>
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
  const [copied, setCopied] = React.useState<'link' | 'code' | null>(null);
  const [canShare, setCanShare] = React.useState(false);
  const [publicOrigin, setPublicOrigin] = React.useState(CANONICAL_SITE_ORIGIN);
  const [program, setProgram] = React.useState<ReferralProgram | undefined>(undefined);

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

  React.useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    setPublicOrigin(getPublicSiteOrigin());
  }, []);

  if (user && !canView) return null;

  const inviteLink = stats
    ? `${publicOrigin}/user/auth?ref=${encodeURIComponent(stats.code)}`
    : '';
  const inviteHost = publicOrigin.replace(/^https?:\/\//, '').replace(/^www\./, '');

  const handleCopy = async (text: string, kind: 'link' | 'code') => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2200);
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    try {
      await navigator.share({
        title: 'KuTaGjej',
        text: 'Regjistrohu në KuTaGjej me kodin tim të ftesës.',
        url: inviteLink,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      await handleCopy(inviteLink, 'link');
    }
  };

  const next = stats ? resolveNextReferralStep(program, stats) : null;

  return (
    <Stack spacing={1.75} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
      <UserPageHeader
        icon={<HandshakeIcon size={20} weight="duotone" />}
        title="Referimi"
        description="Ndani linkun — miqtë regjistrohen, ju fitoni Boost Coins."
      />

      {error ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void load()} disabled={loading} sx={{ fontWeight: 800 }}>
              Provo përsëri
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3.5 }} />
          <Skeleton variant="rounded" height={88} sx={{ borderRadius: 2.5 }} />
        </Stack>
      ) : stats ? (
        <>
          <PortalSurface>
            <Stack spacing={1.75} sx={{ px: { xs: 2.25, sm: 2.75 }, py: 2.15 }}>
              <Box>
                <Typography
                  variant="overline"
                  sx={{ fontWeight: 800, letterSpacing: 0.7, color: 'text.secondary' }}
                >
                  Kodi juaj
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: 'center',
                    mt: 0.75,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: (t) =>
                      t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  }}
                >
                  <Typography
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontWeight: 900,
                      fontSize: '1.15rem',
                      letterSpacing: '0.08em',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}
                  >
                    {stats.code}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label="Kopjo kodin"
                    onClick={() => void handleCopy(stats.code, 'code')}
                    sx={{
                      flexShrink: 0,
                      color: copied === 'code' ? 'primary.main' : 'text.secondary',
                      bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.14 : 0.1),
                    }}
                  >
                    {copied === 'code' ? <CheckIcon size={16} weight="bold" /> : <CopyIcon size={16} />}
                  </IconButton>
                </Stack>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={
                    copied === 'link' ? (
                      <CheckIcon size={18} weight="bold" />
                    ) : (
                      <LinkSimpleIcon size={18} weight="bold" />
                    )
                  }
                  onClick={() => void handleCopy(inviteLink, 'link')}
                  sx={{ ...productButtonSx, py: 1.2, borderRadius: 2.5 }}
                >
                  {copied === 'link' ? 'U kopjua' : 'Kopjo linkun'}
                </Button>
                {canShare ? (
                  <Button
                    variant="outlined"
                    aria-label="Ndaj"
                    onClick={() => void handleShare()}
                    sx={{ ...productButtonSx, minWidth: 52, px: 1.5, borderRadius: 2.5 }}
                  >
                    <ShareNetworkIcon size={18} weight="bold" />
                  </Button>
                ) : null}
              </Stack>

              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, px: 0.15 }}>
                {inviteHost}
              </Typography>

              {next ? (
                <Box>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.7, gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 750 }}>
                      Hapi tjetër: {next.title}
                    </Typography>
                    {next.reward ? (
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', flexShrink: 0 }}>
                        {next.reward}
                      </Typography>
                    ) : null}
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={next.progressPercent}
                    sx={{ height: 6, borderRadius: 3, mb: 0.55 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {next.hint}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }}>
                  Keni arritur të gjitha nivelet aktuale.
                </Typography>
              )}
            </Stack>

            <Divider />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1,
                px: { xs: 2.25, sm: 2.75 },
                py: 1.75,
              }}
            >
              <StatCell label="Referime" value={formatCount(stats.referralCount)} />
              <StatCell label="Boost Coins" value={formatCount(stats.boostCredits)} />
              <StatCell label="Të paguara" value={formatCount(stats.paidReferralCount)} />
              <StatCell
                label="Vlerësimi"
                value={stats.ratingAverage != null ? formatRatingDisplay(stats.ratingAverage) : '—'}
              />
            </Box>

            {stats.referredBy ? (
              <>
                <Divider />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 2.5, py: 1.25 }}>
                  Ju u referuat nga <strong>{stats.referredBy.displayName}</strong>
                </Typography>
              </>
            ) : null}
          </PortalSurface>

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
              <Box sx={{ px: 2.5, py: 2.5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Ende askush. Kopjoni linkun dhe ftoni miqtë.
                </Typography>
              </Box>
            ) : (
              <>
                <ReferredUsersList users={stats.referredUsers.slice(0, RECENT_REFERRALS_LIMIT)} />
                {stats.referredUsers.length > RECENT_REFERRALS_LIMIT ? (
                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: { xs: 1.5, sm: 2 }, py: 0.75 }}>
                    <Button
                      component={RouterLink}
                      href={paths.user.referredUsers}
                      fullWidth
                      endIcon={<CaretRightIcon size={16} weight="bold" />}
                      sx={{
                        ...productButtonSx,
                        py: 1,
                        borderRadius: 2,
                        color: 'text.secondary',
                        fontWeight: 750,
                        fontSize: '0.82rem',
                        '&:hover': {
                          color: 'primary.main',
                          bgcolor: (t) =>
                            t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'action.hover',
                        },
                      }}
                    >
                      Shiko të gjitha
                    </Button>
                  </Box>
                ) : null}
              </>
            )}
          </PortalSurface>

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
                loginStreakDays={stats.loginStreakDays ?? 0}
                compact
              />
            </Stack>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}
