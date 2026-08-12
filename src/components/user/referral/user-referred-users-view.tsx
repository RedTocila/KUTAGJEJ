'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { UsersThree as UsersThreeIcon } from '@phosphor-icons/react/dist/ssr/UsersThree';

import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { PortalSurface } from '@/components/user/portal-cards';
import { ReferredUsersList } from '@/components/user/referral/referred-users-list';
import { useUser } from '@/hooks/use-user';
import { fetchMyReferralStats } from '@/lib/referrals-client';
import type { ReferralSignupEntry } from '@/types/referrals';
import { paths } from '@/paths';

export function UserReferredUsersView() {
  const router = useRouter();
  const { user } = useUser();
  const [users, setUsers] = React.useState<ReferralSignupEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
      setUsers([]);
    } else {
      setUsers(res.referral?.referredUsers ?? []);
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

  return (
    <Stack spacing={1.75} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
      <UserPageHeader
        icon={<UsersThreeIcon size={20} weight="duotone" />}
        title="Të referuarit"
        description="Të gjithë përdoruesit që janë regjistruar me kodin tuaj."
        action={
          users.length > 0 ? (
            <Chip size="small" label={users.length} sx={{ height: 22, fontWeight: 800 }} />
          ) : null
        }
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
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3.5 }} />
      ) : (
        <PortalSurface>
          {users.length === 0 ? (
            <Box sx={{ px: 2.5, py: 2.5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Ende askush. Kopjoni linkun dhe ftoni miqtë.
              </Typography>
            </Box>
          ) : (
            <ReferredUsersList users={users} />
          )}
        </PortalSurface>
      )}
    </Stack>
  );
}
