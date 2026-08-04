'use client';

import * as React from 'react';
import { Alert, Button, Skeleton, Stack } from '@mui/material';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import { AdminEditor } from '@/components/dashboard/referral/referral-admin-editor';
import { ProgramDisplay } from '@/components/dashboard/referral/referral-program-display';
import { useIsPlatformAdmin } from '@/hooks/use-platform-admin';
import { useUser } from '@/hooks/use-user';
import { fetchReferralProgramPublic, putReferralProgram } from '@/lib/referral-program-client';
import type { ReferralProgram } from '@/types/referral-program';

export function ReferralAdminPage() {
  const { user } = useUser();
  const isPlatformAdmin = useIsPlatformAdmin();

  const [program, setProgram] = React.useState<ReferralProgram | null>(null);
  const [draft, setDraft] = React.useState<ReferralProgram | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { program: p, error: err } = await fetchReferralProgramPublic();
      if (cancelled) return;
      if (err || !p) {
        setError(err ?? 'Programi nuk u ngarkua.');
        setProgram(null);
      } else {
        setProgram(p);
        setDraft(p);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = React.useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    const { program: next, error: err } = await putReferralProgram(draft);
    setSaving(false);
    if (err || !next) {
      setSaveError(err ?? 'Ruajtja dështoi.');
      return;
    }
    setProgram(next);
    setDraft(next);
    setEditing(false);
  }, [draft]);

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={React.createElement(HandshakeIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Rritja"
        title="Referimi"
        description="Shiko nivelet, shpërblimet dhe badge-t; administratorët mund t'i përditësojnë vlerat."
        actions={
          isPlatformAdmin ? (
            <Button
              variant={editing ? 'outlined' : 'contained'}
              color="primary"
              startIcon={editing ? undefined : <PencilSimpleIcon size={20} weight="bold" />}
              onClick={() => {
                if (editing) {
                  setDraft(program);
                  setEditing(false);
                  setSaveError(null);
                } else {
                  setDraft(program);
                  setEditing(true);
                }
              }}
            >
              {editing ? 'Anulo redaktimin' : 'Redakto si admin'}
            </Button>
          ) : null
        }
      />

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : loading ? (
        <Skeleton variant="rounded" height={420} />
      ) : program ? (
        <>
          {editing && draft && isPlatformAdmin ? (
            <>
              {saveError ? <Alert severity="error">{saveError}</Alert> : null}
              <AdminEditor draft={draft} onChange={setDraft} saving={saving} onSave={onSave} />
            </>
          ) : null}
          <ProgramDisplay program={editing && draft ? draft : program} />
        </>
      ) : (
        <Alert severity="warning">Nuk ka të dhëna për programin e referimit.</Alert>
      )}
    </Stack>
  );
}
