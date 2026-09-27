'use client';

import * as React from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  REPORT_REASON_LABELS,
  submitContentReport,
  type ReportPayload,
  type ReportReason,
} from '@/lib/moderation-client';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';

export interface ReportContentDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  payload: ReportPayload | null;
  reasons: ReportReason[];
  onSubmitted?: () => void;
}

export function ReportContentDialog({
  open,
  onClose,
  title,
  subtitle,
  payload,
  reasons,
  onSubmitted,
}: ReportContentDialogProps): React.JSX.Element {
  const [reason, setReason] = React.useState<ReportReason | ''>('');
  const [details, setDetails] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setReason('');
    setDetails('');
    setError(null);
    setDone(false);
  }, [open]);

  const handleSubmit = async () => {
    if (!payload || !reason || sending) return;
    setSending(true);
    setError(null);
    const res = await submitContentReport({ ...payload, reason, details: details.trim() || undefined });
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone(true);
    onSubmitted?.();
  };

  const close = sending ? undefined : onClose;

  return (
    <ProductDialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <ProductDialogTitle onClose={close} subtitle={done ? undefined : subtitle}>
        {done ? 'Faleminderit për raportimin' : title}
      </ProductDialogTitle>
      <ProductDialogContent>
        {done ? (
          <Typography color="text.secondary">
            Ekipi ynë do ta shqyrtojë brenda 24 orëve dhe do të heqë përmbajtjen që shkel rregullat.
          </Typography>
        ) : (
          <Stack spacing={2}>
            <RadioGroup value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
              {reasons.map((r) => (
                <FormControlLabel
                  key={r}
                  value={r}
                  control={<Radio size="small" />}
                  label={REPORT_REASON_LABELS[r]}
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.95rem' } }}
                />
              ))}
            </RadioGroup>
            <TextField
              label="Detaje (opsionale)"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              multiline
              minRows={2}
              maxRows={5}
              fullWidth
            />
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        )}
      </ProductDialogContent>
      <ProductDialogActions>
        {done ? (
          <Button variant="contained" onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Mbyll
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={sending} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Anulo
            </Button>
            <Button
              color="error"
              variant="contained"
              disabled={!reason || sending || !payload}
              onClick={() => void handleSubmit()}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {sending ? <CircularProgress size={18} color="inherit" /> : 'Dërgo raportimin'}
            </Button>
          </>
        )}
      </ProductDialogActions>
    </ProductDialog>
  );
}
