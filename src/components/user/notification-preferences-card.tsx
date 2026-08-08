'use client';

import * as React from 'react';
import { Alert, Box, Stack, Switch, Typography } from '@mui/material';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';

import { PortalSectionCard } from '@/components/user/portal-cards';
import { useCopy } from '@/hooks/use-copy';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/user-notifications-client';

const PREF_ORDER: (keyof NotificationPreferences)[] = [
  'messages',
  'listing_saved',
  'listing_shared',
  'listing_hot_lead',
  'listing_status',
  'reviews',
  'reservations',
  'verification',
];

const DEFAULT_PREFS: NotificationPreferences = {
  messages: true,
  listing_saved: true,
  listing_shared: true,
  listing_hot_lead: true,
  listing_status: true,
  reviews: true,
  reservations: true,
  verification: true,
};

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
      const res = await fetchNotificationPreferences();
      if (cancelled) return;
      if (res.preferences) setPrefs(res.preferences);
      if (res.error) setMsg({ type: 'error', text: res.error });
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
      description={t.notifications.prefsDescription}
      icon={React.createElement(GearSixIcon, { size: 22, weight: 'duotone' })}
    >
      <Stack spacing={1.25}>
        {msg ? <Alert severity={msg.type}>{msg.text}</Alert> : null}
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
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <Stack spacing={0.2} sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>
                {labels[key].title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                {labels[key].description}
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
