'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IdentificationCard as IdCardIcon } from '@phosphor-icons/react/dist/ssr/IdentificationCard';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';

import { IdDocumentScannerDialog } from '@/components/user/id-document-scanner-dialog';
import { IdentityFieldHelpAdornment } from '@/components/user/identity-field-help';
import { LockedIdentityField } from '@/components/user/locked-identity-field';
import { useUser } from '@/hooks/use-user';
import {
  fetchProfessionalVerificationStatus,
  submitProfessionalVerificationRequest,
  type ProfessionalVerificationRequest,
  type ProfessionalVerificationStatus,
} from '@/lib/professional-verification-client';
import { uploadListingImages } from '@/lib/uploads-client';

const EMPTY_STATUS: ProfessionalVerificationStatus = {
  verified: false,
  canRequest: true,
  latestRequest: null,
};

export function AccountVerificationCard() {
  const { user } = useUser();
  const isBusiness = Boolean(user && (user.accountType === 'business' || user.role === 'business-user'));

  const [status, setStatus] = React.useState<ProfessionalVerificationStatus>(EMPTY_STATUS);
  const [statusReady, setStatusReady] = React.useState(false);
  const [idNumber, setIdNumber] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [nipt, setNipt] = React.useState('');
  const [idFrontPreview, setIdFrontPreview] = React.useState<string | null>(null);
  const [idFrontFile, setIdFrontFile] = React.useState<File | null>(null);
  const [message, setMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = React.useState(false);

  React.useEffect(() => {
    if (isBusiness && typeof user?.nipt === 'string' && user.nipt.trim()) {
      setNipt(user.nipt.trim());
    }
  }, [isBusiness, user?.nipt]);

  React.useEffect(() => {
    if (typeof user?.phone === 'string' && user.phone.trim()) {
      setPhone(user.phone.trim());
    }
  }, [user?.phone]);

  const refresh = React.useCallback(async () => {
    const res = await fetchProfessionalVerificationStatus();
    if (res.error) {
      setError(res.error);
    } else if (res.status) {
      setStatus(res.status);
      setError(null);
    }
    setStatusReady(true);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    return () => {
      if (idFrontPreview?.startsWith('blob:')) URL.revokeObjectURL(idFrontPreview);
    };
  }, [idFrontPreview]);

  const handleScanCapture = (capture: { file: File; previewUrl: string; idNumber?: string | null }) => {
    setError(null);
    if (idFrontPreview?.startsWith('blob:')) URL.revokeObjectURL(idFrontPreview);
    setIdFrontFile(capture.file);
    setIdFrontPreview(capture.previewUrl);
    if (capture.idNumber?.trim()) {
      setIdNumber(capture.idNumber.trim());
    }
    setScannerOpen(false);
  };

  const handleScannerClose = () => {
    setScannerOpen(false);
  };

  const resetForm = () => {
    setIdNumber('');
    setMessage('');
    setIdFrontFile(null);
    if (idFrontPreview?.startsWith('blob:')) URL.revokeObjectURL(idFrontPreview);
    setIdFrontPreview(null);
    if (typeof user?.phone === 'string' && user.phone.trim()) {
      setPhone(user.phone.trim());
    } else {
      setPhone('');
    }
    if (isBusiness && typeof user?.nipt === 'string' && user.nipt.trim()) {
      setNipt(user.nipt.trim());
    } else if (!isBusiness) {
      setNipt('');
    }
  };

  const handleSubmit = async () => {
    const trimmedId = idNumber.trim();
    const trimmedPhone = phone.trim();
    const trimmedNipt = nipt.trim();
    if (!trimmedId) {
      setError('Numri i ID-së është i detyrueshëm.');
      return;
    }
    if (!trimmedPhone) {
      setError('Numri i telefonit është i detyrueshëm.');
      return;
    }
    if (trimmedPhone.length < 6 || trimmedPhone.length > 40 || !/^[\d+\s().-]{6,40}$/.test(trimmedPhone)) {
      setError('Numri i telefonit nuk është i vlefshëm.');
      return;
    }
    if (!idFrontFile) {
      setError('Skanoni foton e përparme të ID-së.');
      return;
    }
    if (isBusiness && !trimmedNipt) {
      setError('NIPT është i detyrueshëm për llogaritë e biznesit.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const up = await uploadListingImages([idFrontFile], 'verification-id');
    if (up.error || !up.urls[0]) {
      setError(up.error || 'Ngarkimi i fotos së ID-së dështoi.');
      setSubmitting(false);
      return;
    }

    const res = await submitProfessionalVerificationRequest({
      message,
      idNumber: trimmedId,
      phone: trimmedPhone,
      idFrontImageUrl: up.urls[0],
      nipt: isBusiness ? trimmedNipt : undefined,
    });
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess('Kërkesa u dërgua. Do të njoftoheni pas shqyrtimit nga administratori.');
      resetForm();
      await refresh();
    }
    setSubmitting(false);
  };

  const latest: ProfessionalVerificationRequest | null = status.latestRequest ?? null;
  const showForm = !status.verified && status.canRequest;
  const profileNiptLocked = isBusiness && typeof user?.nipt === 'string' && user.nipt.trim().length > 0;
  const submittedIdNumber = latest?.idNumber?.trim() || '';
  const showSubmittedId = Boolean(submittedIdNumber && (status.verified || latest?.status === 'pending'));

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Pas aprovimit, shenja e verifikuar shfaqet në profilin tuaj publik. Dërgoni numrin e ID-së, numrin
        e telefonit dhe skanoni pjesën e përparme të kartës
        {isBusiness ? ', si dhe NIPT për llogaritë e biznesit' : ''}.
      </Typography>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {status.verified ? (
        <Chip
          icon={<ShieldCheckIcon size={16} weight="fill" />}
          label="Llogaria e verifikuar"
          color="success"
          sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
        />
      ) : null}

      {statusReady && latest?.status === 'pending' ? (
        <Alert severity="info">
          Kërkesa juaj është në pritje
          {latest.createdAt
            ? ` (e dërguar ${new Date(latest.createdAt).toLocaleDateString('sq-AL')})`
            : ''}
          . Administratori do ta shqyrtojë së shpejti.
        </Alert>
      ) : null}

      {statusReady && latest?.status === 'rejected' ? (
        <Alert severity="warning">
          Kërkesa e fundit u refuzua
          {latest.adminNote ? `: ${latest.adminNote}` : '.'} Mund të dërgoni një kërkesë të re.
        </Alert>
      ) : null}

      {showSubmittedId ? (
        <LockedIdentityField
          label="Numri i ID-së"
          value={submittedIdNumber}
          fieldKind="id"
          userEmail={user?.email}
        />
      ) : null}

      {showForm ? (
        <>
          <TextField
            label="Numri i ID-së"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            fullWidth
            required
            disabled={submitting}
            placeholder="p.sh. J12345678A"
            slotProps={{
              htmlInput: { maxLength: 40 },
              input: {
                endAdornment: (
                  <IdentityFieldHelpAdornment
                    fieldKind="id"
                    currentValue={idNumber}
                    userEmail={user?.email}
                  />
                ),
              },
            }}
          />

          <TextField
            label="Numri i telefonit"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
            required
            disabled={submitting}
            placeholder="p.sh. +355 69 123 4567"
            autoComplete="tel"
            slotProps={{ htmlInput: { maxLength: 40 } }}
          />

          {isBusiness ? (
            profileNiptLocked ? (
              <LockedIdentityField
                label="NIPT"
                value={nipt}
                fieldKind="nipt"
                userEmail={user?.email}
              />
            ) : (
              <TextField
                label="NIPT"
                value={nipt}
                onChange={(e) => setNipt(e.target.value)}
                fullWidth
                required
                disabled={submitting}
                placeholder="Numri i NIPT-it të biznesit"
                slotProps={{
                  htmlInput: { maxLength: 40 },
                  input: {
                    endAdornment: (
                      <IdentityFieldHelpAdornment
                        fieldKind="nipt"
                        currentValue={nipt}
                        userEmail={user?.email}
                      />
                    ),
                  },
                }}
              />
            )
          ) : null}

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              Fotoja e përparme e ID-së *
            </Typography>
            {idFrontPreview ? (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 360,
                  aspectRatio: `${85.6} / ${53.98}`,
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={idFrontPreview}
                  alt="Paraqitja e ID-së"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <Button
                  size="small"
                  variant="contained"
                  color="inherit"
                  disabled={submitting}
                  onClick={() => setScannerOpen(true)}
                  sx={{ position: 'absolute', bottom: 8, right: 8, fontWeight: 700 }}
                >
                  Ri-skano
                </Button>
              </Box>
            ) : (
              <Button
                variant="outlined"
                startIcon={<IdCardIcon size={18} />}
                disabled={submitting}
                onClick={() => setScannerOpen(true)}
                sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
              >
                Skano ID-në
              </Button>
            )}
          </Box>

          <TextField
            label="Mesazh për administratorin (opsional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            disabled={submitting}
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

      <IdDocumentScannerDialog
        open={scannerOpen}
        onClose={handleScannerClose}
        onCapture={handleScanCapture}
      />
    </Stack>
  );
}
