'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Envelope as EnvelopeIcon } from '@phosphor-icons/react/dist/ssr/Envelope';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';

import { authClient } from '@/lib/auth/client';
import { useUser } from '@/hooks/use-user';
import { getUserPortalAccountCategoryLabel } from '@/lib/user-portal-account-label';
import { JobEmployerVerificationCard } from '@/components/jobs/job-employer-verification-card';

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', py: 1.5 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex', pt: 0.25 }}>{icon}</Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
          {value || '—'}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function UserProfilePage() {
  const { user, checkSession } = useUser();

  const [phoneInput, setPhoneInput] = React.useState('');
  const [phoneSaving, setPhoneSaving] = React.useState(false);
  const [phoneMsg, setPhoneMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordMsg, setPasswordMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = React.useState(false);

  React.useEffect(() => {
    setPhoneInput(typeof user?.phone === 'string' ? user.phone : '');
  }, [user?.id, user?.phone]);

  const onSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const canEditPhone =
      user.accountType === 'individual' ||
      user.accountType === 'business' ||
      user.role === 'business-user';
    if (!canEditPhone) return;
    setPhoneMsg(null);
    setPhoneSaving(true);
    try {
      const { error } = await authClient.updatePortalProfile({ phone: phoneInput.trim() });
      if (error) {
        setPhoneMsg({ type: 'error', text: error });
        return;
      }
      setPhoneMsg({ type: 'success', text: 'Numri i telefonit u ruajt.' });
      await checkSession();
    } finally {
      setPhoneSaving(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Fjalëkalimet e reja nuk përputhen.' });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await authClient.changePortalPassword({
        currentPassword,
        newPassword,
      });
      if (error) {
        setPasswordMsg({ type: 'error', text: error });
        return;
      }
      setPasswordMsg({ type: 'success', text: 'Fjalëkalimi u ndryshua.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  const categoryLabel = getUserPortalAccountCategoryLabel(user);
  const isBusiness = user.accountType === 'business' || user.role === 'business-user';
  const canEditPhone =
    user.accountType === 'individual' || user.accountType === 'business' || user.role === 'business-user';

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Profili im
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Të dhënat e llogarisë sipas regjistrimit tuaj.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
                Kategoria e llogarisë
              </Typography>
              <Box sx={{ mt: 2, mb: 1 }}>
                <Chip
                  icon={
                    isBusiness
                      ? React.createElement(BuildingsIcon, { size: 18, weight: 'duotone' })
                      : React.createElement(UserIcon, { size: 18, weight: 'duotone' })
                  }
                  label={categoryLabel}
                  color="primary"
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    py: 2.5,
                    px: 0.5,
                    borderWidth: 2,
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {isBusiness
                  ? 'Kjo llogari është krijuar si biznes — shfaqen të dhënat e aktivitetit tregtar.'
                  : 'Kjo llogari është krijuar si individ — shfaqen emri juaj dhe kontakti.'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 3, pt: 3, pb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Të dhënat
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ px: 3, pb: 2 }}>
                {isBusiness ? (
                  <>
                    <ProfileRow
                      icon={React.createElement(FileTextIcon, { size: 22 })}
                      label="NIPT"
                      value={String(user.nipt ?? '')}
                    />
                    <Divider />
                    <ProfileRow
                      icon={React.createElement(BuildingsIcon, { size: 22 })}
                      label="Emri i biznesit"
                      value={String(user.businessName ?? '')}
                    />
                    <Divider />
                    <ProfileRow
                      icon={React.createElement(UserIcon, { size: 22 })}
                      label="Pronari i biznesit"
                      value={String(user.businessOwner ?? '')}
                    />
                    <Divider />
                    <ProfileRow
                      icon={React.createElement(BuildingsIcon, { size: 22 })}
                      label="Kategoria e biznesit"
                      value={String(user.businessCategory ?? '')}
                    />
                    <Divider />
                    <ProfileRow
                      icon={React.createElement(EnvelopeIcon, { size: 22 })}
                      label="Email"
                      value={user.email}
                    />
                  </>
                ) : (
                  <>
                    <ProfileRow
                      icon={React.createElement(UserIcon, { size: 22 })}
                      label="Emri"
                      value={String(user.firstName ?? '')}
                    />
                    <Divider />
                    <ProfileRow
                      icon={React.createElement(UserIcon, { size: 22 })}
                      label="Mbiemri"
                      value={String(user.lastName ?? '')}
                    />
                    <Divider />
                    <ProfileRow
                      icon={React.createElement(EnvelopeIcon, { size: 22 })}
                      label="Email"
                      value={user.email}
                    />
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {canEditPhone ? (
          <Grid size={{ xs: 12 }}>
            <JobEmployerVerificationCard />
          </Grid>
        ) : null}

        {canEditPhone ? (
          <Grid size={{ xs: 12 }}>
            <Card component="form" onSubmit={onSavePhone}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Numri i telefonit
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Ruhet në llogarinë tuaj dhe plotësohet automatikisht te forma e njoftimit; mund ta ndryshoni atje për çdo
                  njoftim veç e veç.
                </Typography>
                {phoneMsg ? (
                  <Alert severity={phoneMsg.type} sx={{ mb: 2 }}>
                    {phoneMsg.text}
                  </Alert>
                ) : null}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-end' } }}>
                  <TextField
                    label="Telefoni"
                    type="tel"
                    value={phoneInput}
                    onChange={(ev) => setPhoneInput(ev.target.value)}
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: 40 } }}
                    autoComplete="tel"
                  />
                  <Button type="submit" variant="contained" disabled={phoneSaving} sx={{ flexShrink: 0 }}>
                    {phoneSaving ? 'Duke ruajtur…' : 'Ruaj'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ) : null}

        <Grid size={{ xs: 12 }}>
          <Card component="form" onSubmit={onChangePassword}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Fjalëkalimi
              </Typography>
              {passwordMsg ? (
                <Alert severity={passwordMsg.type} sx={{ mb: 2 }}>
                  {passwordMsg.text}
                </Alert>
              ) : null}
              <Stack spacing={2} sx={{ maxWidth: { sm: 480 } }}>
                <TextField
                  label="Fjalëkalimi aktual"
                  type="password"
                  value={currentPassword}
                  onChange={(ev) => setCurrentPassword(ev.target.value)}
                  fullWidth
                  required
                  autoComplete="current-password"
                />
                <TextField
                  label="Fjalëkalimi i ri"
                  type="password"
                  value={newPassword}
                  onChange={(ev) => setNewPassword(ev.target.value)}
                  fullWidth
                  required
                  autoComplete="new-password"
                />
                <TextField
                  label="Përsërit fjalëkalimin e ri"
                  type="password"
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  fullWidth
                  required
                  autoComplete="new-password"
                />
                <Button type="submit" variant="contained" color="secondary" disabled={savingPassword} sx={{ alignSelf: 'flex-start' }}>
                  {savingPassword ? 'Duke u përditësuar…' : 'Ndrysho fjalëkalimin'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
