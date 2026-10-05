'use client';

import * as React from 'react';
import { Alert, Box, Button, Stack, TextField } from '@mui/material';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { paths } from '@/paths';
import { deleteOwnAccount } from '@/lib/account-client';
import { authClient } from '@/lib/auth/client';
import { getMessages } from '@/lib/i18n/messages';
import { useLanguage } from '@/contexts/language-context';
import { TransientNotification, TransientSuccessAlert } from '@/components/core/transient-success-alert';
import { PortalSectionCard } from '@/components/user/portal-cards';

export function DeleteAccountCard() {
  const { language } = useLanguage();
  const t = getMessages(language);

  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = React.useState('');
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [deleteMsg, setDeleteMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    setDeleteConfirmPhrase('');
    setDeleteMsg(null);
  }, [language, t.profileAccount.deleteConfirmPhrase]);

  const onDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteMsg(null);
    const requiredPhrase = t.profileAccount.deleteConfirmPhrase;
    const typed = deleteConfirmPhrase.trim();
    if (!typed) {
      setDeleteMsg({ type: 'error', text: t.profileAccount.deletePhraseMissing });
      return;
    }
    if (typed !== requiredPhrase) {
      setDeleteMsg({ type: 'error', text: t.profileAccount.deletePhraseMismatch });
      return;
    }
    setDeleteBusy(true);
    try {
      const result = await deleteOwnAccount(typed);
      if (result.error) {
        setDeleteMsg({ type: 'error', text: result.error });
        return;
      }
      setDeleteMsg({ type: 'success', text: result.message || 'Llogaria u fshi.' });
      await authClient.signOut(paths.home);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <PortalSectionCard
      title={t.profileAccount.deleteTitle}
      description={t.profileAccount.deleteDescription}
      icon={<TrashIcon size={22} weight="duotone" />}
    >
      <Box component="form" onSubmit={(e) => void onDeleteAccount(e)}>
        <Stack spacing={2} sx={{ maxWidth: 440 }}>
          {deleteMsg?.type === 'success' ? (
            <TransientSuccessAlert message={deleteMsg.text} onDismiss={() => setDeleteMsg(null)} />
          ) : deleteMsg ? (
            <TransientNotification severity="error" message={deleteMsg.text} onDismiss={() => setDeleteMsg(null)} />
          ) : null}
          <Alert severity="warning" variant="outlined">
            {t.profileAccount.deleteWarning}
          </Alert>
          <TextField
            label={t.profileAccount.deleteConfirmLabel}
            value={deleteConfirmPhrase}
            onChange={(ev) => setDeleteConfirmPhrase(ev.target.value)}
            placeholder={t.profileAccount.deleteConfirmPhrase}
            helperText={t.profileAccount.deleteConfirmHint(t.profileAccount.deleteConfirmPhrase)}
            fullWidth
            required
            autoComplete="off"
            slotProps={{
              htmlInput: {
                'aria-label': t.profileAccount.deleteConfirmLabel,
                spellCheck: false,
                autoCapitalize: 'characters',
              },
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                letterSpacing: '0.04em',
                fontWeight: 700,
              },
            }}
          />
          <Button
            type="submit"
            variant="outlined"
            color="error"
            disabled={deleteBusy || deleteConfirmPhrase.trim() !== t.profileAccount.deleteConfirmPhrase}
            sx={{ alignSelf: 'flex-start', fontWeight: 800, borderRadius: 2.5 }}
          >
            {deleteBusy ? t.profileAccount.deleteBusy : t.profileAccount.deleteSubmit}
          </Button>
        </Stack>
      </Box>
    </PortalSectionCard>
  );
}
