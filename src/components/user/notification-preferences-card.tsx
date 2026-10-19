'use client';

import * as React from 'react';
import { Alert, Box, Button, Stack, Switch, Typography } from '@mui/material';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';

import { useIsNativeApp } from '@/hooks/use-is-native-app';
import {
  readNativePushPermission,
  registerNativePush,
  type NativePushPermission,
} from '@/lib/native-app';
import { rememberNativePushToken, syncNativePushToken } from '@/lib/native-push-client';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/user-notifications-client';
import { useCopy } from '@/hooks/use-copy';
import { TransientNotification, TransientSuccessAlert } from '@/components/core/transient-success-alert';
import { PortalSectionCard } from '@/components/user/portal-cards';

const PREF_ORDER: (keyof NotificationPreferences)[] = [
  'messages',
  'listing_status',
  'reviews',
  'reservations',
  'verification',
];

const DEFAULT_PREFS: NotificationPreferences = {
  messages: true,
  listing_status: true,
  reviews: true,
  reservations: true,
  verification: true,
};

function NativePushPermissionRow() {
  const t = useCopy();
  const native = useIsNativeApp();
  const [permission, setPermission] = React.useState<NativePushPermission | 'unknown'>('unknown');
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!native) return undefined;
    let cancelled = false;
    void readNativePushPermission().then((next) => {
      if (!cancelled) setPermission(next);
    });
    return () => {
      cancelled = true;
    };
  }, [native]);

  if (!native) return null;

  const enable = async () => {
    setBusy(true);
    setNote(null);
    const result = await registerNativePush({ requestPermission: true });
    setBusy(false);
    if (result.status === 'token') {
      rememberNativePushToken(result.token);
      await syncNativePushToken();
      setPermission('granted');
      setNote(t.notifications.devicePushEnabled);
      return;
    }
    if (result.status === 'denied') {
      setPermission('denied');
      setNote(t.notifications.devicePushDenied);
      return;
    }
    if (result.status === 'skipped') return;
    setPermission('unavailable');
    setNote(t.notifications.devicePushUnavailable);
  };

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.15,
        borderRadius: 2,
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
      }}
    >
      <Stack spacing={1}>
        <Stack spacing={0.2}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>
            {t.notifications.devicePushTitle}
          </Typography>
          {permission === 'granted' || permission === 'denied' || permission === 'unavailable' ? (
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
              {permission === 'granted'
                ? t.notifications.devicePushOn
                : permission === 'denied'
                  ? t.notifications.devicePushDenied
                  : t.notifications.devicePushUnavailable}
            </Typography>
          ) : null}
        </Stack>
        {permission === 'prompt' || permission === 'unknown' ? (
          <Button variant="contained" disabled={busy || permission === 'unknown'} onClick={() => void enable()} sx={{ alignSelf: 'flex-start' }}>
            {t.notifications.devicePushEnable}
          </Button>
        ) : null}
        {note ? (
          <Alert severity={permission === 'granted' ? 'success' : 'warning'} sx={{ borderRadius: 2 }}>
            {note}
          </Alert>
        ) : null}
      </Stack>
    </Box>
  );
}

export function NotificationPreferencesCard() {
  const t = useCopy();
  const [prefs, setPrefs] = React.useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = React.useState(true);
  const [savingKey, setSavingKey] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setMsg(null);
      let res = await fetchNotificationPreferences();
      if (!cancelled && !res.preferences && res.error) {
        await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;
        res = await fetchNotificationPreferences();
      }
      if (cancelled) return;
      if (res.preferences) setPrefs(res.preferences);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value });
    setSavingKey(key);
    setMsg(null);
    const res = await updateNotificationPreferences({ [key]: value });
    setSavingKey(null);
    if (res.error) {
      setPrefs(prev);
      setMsg({ type: 'error', text: res.error });
      return;
    }
    if (res.preferences) setPrefs(res.preferences);
  };

  const labels = t.notifications.prefs;

  return (
    <PortalSectionCard
      title={t.notifications.prefsTitle}
      icon={React.createElement(GearSixIcon, { size: 22, weight: 'duotone' })}
    >
      <Stack spacing={1.25}>
        <NativePushPermissionRow />
        {msg?.type === 'success' ? (
          <TransientSuccessAlert message={msg.text} onDismiss={() => setMsg(null)} />
        ) : msg ? (
          <TransientNotification severity="error" message={msg.text} onDismiss={() => setMsg(null)} />
        ) : null}
        {PREF_ORDER.map((key) => (
            <Box
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1.15,
                borderRadius: 2,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
              }}
            >
              <Stack spacing={0.2} sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>
                  {labels[key].title}
                </Typography>
              </Stack>
              <Switch
                checked={prefs[key]}
                disabled={loading || savingKey === key}
                onChange={(_, checked) => void onToggle(key, checked)}
                edge="end"
                slotProps={{ input: { 'aria-label': labels[key].title } }}
              />
            </Box>
          ))}
      </Stack>
    </PortalSectionCard>
  );
}
