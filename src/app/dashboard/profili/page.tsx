'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { UserGear as UserGearIcon } from '@phosphor-icons/react/dist/ssr/UserGear';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import { authClient } from '@/lib/auth/client';
import { useUser } from '@/hooks/use-user';

export default function AdminProfilePage() {
  const { user, checkSession } = useUser();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const [profileMsg, setProfileMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setEmail(user.email ?? '');
  }, [user]);

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!email.trim()) {
      setProfileMsg({ type: 'error', text: 'Emaili është i detyrueshëm.' });
      return;
    }
    setSavingProfile(true);
    try {
      const { error } = await authClient.updateAdminProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
      });
      if (error) {
        setProfileMsg({ type: 'error', text: error });
        return;
      }
      setProfileMsg({ type: 'success', text: 'Profili u ruajt.' });
      await checkSession();
    } finally {
      setSavingProfile(false);
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
      const { error } = await authClient.changeAdminPassword({
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

  const isManagedStaff = user.accountType === 'managed';

  if (isManagedStaff) {
    return (
      <Stack spacing={3}>
        <AdminPageHeader
          icon={React.createElement(UserGearIcon, { size: 22, weight: 'duotone' })}
          eyebrow="Llogaria"
          title="Profili im"
          description="Llogaria juaj menaxhohet nga administratori i platformës."
        />
        <Alert severity="info">
          Përditësimet e emailit, fjalëkalimit dhe të dhënave të tjera bëhen vetëm nga një administrator KuTaGjej.
        </Alert>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1">{user.email}</Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                Roli
              </Typography>
              <Typography variant="body1">{user.role}</Typography>
              {(user.firstName || user.lastName) ? (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                    Emri
                  </Typography>
                  <Typography variant="body1">
                    {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                  </Typography>
                </>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={React.createElement(UserGearIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Llogaria"
        title="Profili im"
        description="Përditëso të dhënat e llogarisë së administratorit dhe fjalëkalimin."
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card component="form" onSubmit={onSaveProfile}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Të dhënat
              </Typography>
              {profileMsg ? (
                <Alert severity={profileMsg.type} sx={{ mb: 2 }}>
                  {profileMsg.text}
                </Alert>
              ) : null}
              <Stack spacing={2}>
                <TextField
                  label="Emri"
                  value={firstName}
                  onChange={(ev) => {
                    setFirstName(ev.target.value);
                  }}
                  fullWidth
                  autoComplete="given-name"
                />
                <TextField
                  label="Mbiemri"
                  value={lastName}
                  onChange={(ev) => {
                    setLastName(ev.target.value);
                  }}
                  fullWidth
                  autoComplete="family-name"
                />
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(ev) => {
                    setEmail(ev.target.value);
                  }}
                  fullWidth
                  required
                  autoComplete="email"
                />
                <Button type="submit" variant="contained" disabled={savingProfile} sx={{ alignSelf: 'flex-start' }}>
                  {savingProfile ? 'Duke u ruajtur…' : 'Ruaj ndryshimet'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
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
              <Stack spacing={2}>
                <TextField
                  label="Fjalëkalimi aktual"
                  type="password"
                  value={currentPassword}
                  onChange={(ev) => {
                    setCurrentPassword(ev.target.value);
                  }}
                  fullWidth
                  autoComplete="current-password"
                />
                <TextField
                  label="Fjalëkalimi i ri"
                  type="password"
                  value={newPassword}
                  onChange={(ev) => {
                    setNewPassword(ev.target.value);
                  }}
                  fullWidth
                  autoComplete="new-password"
                />
                <TextField
                  label="Përsërit fjalëkalimin e ri"
                  type="password"
                  value={confirmPassword}
                  onChange={(ev) => {
                    setConfirmPassword(ev.target.value);
                  }}
                  fullWidth
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
