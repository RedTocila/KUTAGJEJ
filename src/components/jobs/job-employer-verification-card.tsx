'use client';

import * as React from 'react';
import {
  Alert,
  Box,
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
  fetchJobEmployerVerificationStatus,
  submitJobEmployerVerificationRequest,
  type JobEmployerVerificationStatus,
} from '@/lib/job-employer-verification-client';

export function JobEmployerVerificationCard({ embedded = false }: { embedded?: boolean }) {
  const [status, setStatus] = React.useState<JobEmployerVerificationStatus | null>(null);
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchJobEmployerVerificationStatus();
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
    const res = await submitJobEmployerVerificationRequest(message);
    if (res.error) setError(res.error);
    else {
      setSuccess('Kërkesa u dërgua. Do të njoftoheni pas shqyrtimit nga administratori.');
      setMessage('');
      await refresh();
    }
    setSubmitting(false);
  };

  const latest = status?.latestRequest;

  const body = (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <ShieldCheckIcon size={22} weight="duotone" color="var(--mui-palette-primary-main)" />
        <Typography sx={{ fontWeight: 800, fontSize: '0.98rem' }}>Verifikimi për Punë</Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Shenja e verifikuar shfaqet te njoftimet e punës dhe rrit besimin e kandidatëve.
      </Typography>

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Duke ngarkuar…
        </Typography>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {status?.verified ? (
        <Chip label="Profili i verifikuar" color="success" sx={{ alignSelf: 'flex-start', fontWeight: 700 }} />
      ) : latest?.status === 'pending' ? (
        <Alert severity="info">
          Kërkesa juaj është në pritje (e dërguar{' '}
          {new Date(latest.createdAt).toLocaleDateString('sq-AL')}). Administratori do ta shqyrtojë së shpejti.
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
            placeholder="p.sh. Kompania jonë operon që prej 2018…"
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

  if (embedded) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
        }}
      >
        {body}
      </Box>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>{body}</CardContent>
    </Card>
  );
}
