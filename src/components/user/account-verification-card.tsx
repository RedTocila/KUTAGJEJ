'use client';

import * as React from 'react';
import { Alert, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';

import {
  fetchProfessionalVerificationStatus,
  submitProfessionalVerificationRequest,
  type ProfessionalVerificationRequest,
  type ProfessionalVerificationStatus,
} from '@/lib/professional-verification-client';

export function AccountVerificationCard() {
  const [status, setStatus] = React.useState<ProfessionalVerificationStatus | null>(null);
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchProfessionalVerificationStatus();
    if (res.error) setError(res.error);
    else setStatus(res.status ?? null);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const res = await submitProfessionalVerificationRequest(message);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess('Kërkesa u dërgua. Do të njoftoheni pas shqyrtimit nga administratori.');
      setMessage('');
      await refresh();
    }
    setSubmitting(false);
  };

  const latest: ProfessionalVerificationRequest | null = status?.latestRequest ?? null;

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Pas aprovimit, shenja e verifikuar shfaqet në profilin tuaj publik.
      </Typography>

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Duke ngarkuar…
        </Typography>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {status?.verified ? (
        <Chip
          icon={<ShieldCheckIcon size={16} weight="fill" />}
          label="Llogaria e verifikuar"
          color="success"
          sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
        />
      ) : latest?.status === 'pending' ? (
        <Alert severity="info">
          Kërkesa juaj është në pritje
          {latest.createdAt
            ? ` (e dërguar ${new Date(latest.createdAt).toLocaleDateString('sq-AL')})`
            : ''}
          . Administratori do ta shqyrtojë së shpejti.
        </Alert>
      ) : latest?.status === 'rejected' ? (
        <Alert severity="warning">
          Kërkesa e fundit u refuzua
          {latest.adminNote ? `: ${latest.adminNote}` : '.'} Mund të dërgoni një kërkesë të re.
        </Alert>
      ) : null}

      {status && !status.verified && status.canRequest ? (
        <>
          <TextField
            label="Mesazh për administratorin (opsional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            placeholder="p.sh. Informacion shtesë për verifikimin…"
          />
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
          >
            {submitting ? 'Duke dërguar…' : 'Kërko verifikimin'}
          </Button>
        </>
      ) : null}
    </Stack>
  );
}
