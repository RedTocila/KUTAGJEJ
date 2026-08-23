'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Stack,
  Typography,
} from '@mui/material';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlash as EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';

import { AuthScreenShell } from '@/components/user/auth-screen-shell';
import { useCopy } from '@/hooks/use-copy';
import { authClient } from '@/lib/auth/client';
import { passwordInputDisableSuggestions } from '@/lib/auth/password-input';
import { getDefaultAuthenticatedPath } from '@/lib/auth/post-login-path';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { productButtonSx } from '@/styles/product-sx';

const outlinedFieldSx = {
  borderRadius: 2.5,
  bgcolor: 'background.default',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
  '&.Mui-focused': {
    boxShadow: `0 0 0 3px ${primaryMainAlpha(0.12)}`,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
  },
};

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetPasswordInner />
    </React.Suspense>
  );
}

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const t = useCopy();
  const tokenHash = (searchParams.get('token_hash') || searchParams.get('tokenHash') || '').trim();
  const type = (searchParams.get('type') || 'recovery').trim() || 'recovery';
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const { error, message: okMessage } = await authClient.forgotPassword(email.trim());
      if (error) {
        setMessage({ type: 'error', text: error });
        return;
      }
      setMessage({ type: 'success', text: okMessage || t.auth.resetPasswordSent });
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Fjalëkalimet nuk përputhen.' });
      return;
    }
    setBusy(true);
    try {
      const { error, user } = await authClient.resetPasswordWithToken({
        tokenHash,
        type,
        newPassword: password,
      });
      if (error || !user) {
        setMessage({ type: 'error', text: error || t.auth.confirmFailed });
        return;
      }
      window.location.href = getDefaultAuthenticatedPath(user);
    } finally {
      setBusy(false);
    }
  };

  if (tokenHash) {
    return (
      <AuthScreenShell title={t.auth.resetPasswordTitle} subtitle={t.auth.newPassword}>
        <Box component="form" onSubmit={(e) => void savePassword(e)} noValidate>
          <Stack spacing={2}>
            {message ? <Alert severity={message.type}>{message.text}</Alert> : null}
            <FormControl fullWidth>
              <Typography component="label" variant="caption" sx={{ mb: 1, fontWeight: 600 }}>
                {t.auth.newPassword}
              </Typography>
              <OutlinedInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                sx={outlinedFieldSx}
                {...passwordInputDisableSuggestions}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                      edge="end"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeIcon size={20} /> : <EyeSlashIcon size={20} />}
                    </IconButton>
                  </InputAdornment>
                }
              />
            </FormControl>
            <FormControl fullWidth>
              <Typography component="label" variant="caption" sx={{ mb: 1, fontWeight: 600 }}>
                {t.auth.confirmPassword}
              </Typography>
              <OutlinedInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                sx={outlinedFieldSx}
                {...passwordInputDisableSuggestions}
              />
            </FormControl>
            <Button type="submit" variant="contained" disabled={busy} fullWidth sx={{ ...productButtonSx, py: 1.5 }}>
              {busy ? t.auth.submitting : t.auth.saveNewPassword}
            </Button>
          </Stack>
        </Box>
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell title={t.auth.resetPasswordTitle} subtitle={t.auth.resetPasswordHint}>
      <Box component="form" onSubmit={(e) => void requestReset(e)} noValidate>
        <Stack spacing={2}>
          {message ? <Alert severity={message.type}>{message.text}</Alert> : null}
          <FormControl fullWidth>
            <Typography component="label" variant="caption" sx={{ mb: 1, fontWeight: 600 }}>
              {t.auth.email}
            </Typography>
            <OutlinedInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="ju@shembull.com"
              sx={outlinedFieldSx}
            />
          </FormControl>
          <Button type="submit" variant="contained" disabled={busy || !email.trim()} fullWidth sx={{ ...productButtonSx, py: 1.5 }}>
            {busy ? t.auth.submitting : t.auth.resetPasswordSubmit}
          </Button>
        </Stack>
      </Box>
    </AuthScreenShell>
  );
}
