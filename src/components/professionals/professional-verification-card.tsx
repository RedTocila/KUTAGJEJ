'use client';

import * as React from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';

import {
  fetchProfessionalVerificationStatus,
  submitProfessionalVerificationRequest,
  type ProfessionalVerificationStatus,
} from '@/lib/professional-verification-client';

export function ProfessionalVerificationCard() {
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
    if (res.error) setError(res.error);
    else {
      setSuccess('Kërkesa u dërgua. Do të njoftoheni pas shqyrtimit.');
      setMessage('');
      await refresh();
    }
    setSubmitting(false);
  };

  const latest = status?.latestRequest;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <ShieldCheckIcon size={24} weight="duotone" color="var(--mui-palette-primary-main)" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Verifikimi — Profesionistë
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Pas aprovimit, shenja e verifikuar shfaqet në profilin tuaj publik të profesionistit.
          </Typography>

          {loading ? <Typography variant="body2" color="text.secondary">Duke ngarkuar…</Typography> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}

          {status?.verified ? (
            <Chip icon={<ShieldCheckIcon size={16} weight="fill" />} label="Profili i verifikuar" color="success" />
          ) : null}

          {!loading && !status?.verified && latest?.status === 'pending' ? (
            <Alert severity="info">Kërkesa juaj është në pritje për shqyrtim.</Alert>
          ) : null}

          {!loading && !status?.verified && latest?.status === 'rejected' ? (
            <Alert severity="warning">
              Kërkesa u refuzua.{latest.adminNote ? ` Shënim: ${latest.adminNote}` : ''}
            </Alert>
          ) : null}

          {status?.canRequest ? (
            <>
              <TextField
                label="Mesazh për administratorin (opsionale)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                multiline
                minRows={2}
                fullWidth
              />
              <Button variant="contained" disabled={submitting} onClick={() => void handleSubmit()}>
                {submitting ? 'Duke dërguar…' : 'Kërko verifikimin'}
              </Button>
            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
