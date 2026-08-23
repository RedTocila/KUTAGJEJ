'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';

import { AuthScreenShell } from '@/components/user/auth-screen-shell';
import { useCopy } from '@/hooks/use-copy';
import { authClient } from '@/lib/auth/client';
import { getDefaultAuthenticatedPath } from '@/lib/auth/post-login-path';

function ConfirmEmailInner() {
  const searchParams = useSearchParams();
  const t = useCopy();
  const tokenHash = (searchParams.get('token_hash') || searchParams.get('tokenHash') || '').trim();
  const type = (searchParams.get('type') || 'magiclink').trim() || 'magiclink';
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!tokenHash) {
      setError(t.auth.confirmFailed);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { error: confirmError, user } = await authClient.confirmEmail(tokenHash, type);
      if (cancelled) return;
      if (confirmError || !user) {
        setError(confirmError || t.auth.confirmFailed);
        return;
      }
      window.location.href = getDefaultAuthenticatedPath(user);
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenHash, type, t.auth.confirmFailed]);

  return (
    <AuthScreenShell title={t.auth.checkEmailTitle} subtitle={error ? undefined : t.auth.confirmingEmail}>
      <Stack spacing={2} sx={{ alignItems: 'center', py: 2 }}>
        {error ? (
          <Alert severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        ) : (
          <>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              {t.auth.confirmingEmail}
            </Typography>
          </>
        )}
      </Stack>
    </AuthScreenShell>
  );
}

export default function ConfirmEmailPage() {
  return (
    <React.Suspense fallback={null}>
      <ConfirmEmailInner />
    </React.Suspense>
  );
}
