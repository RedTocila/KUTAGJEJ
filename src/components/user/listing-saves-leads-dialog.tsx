'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { ChatsCircle as ChatsIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { Crown as CrownIcon } from '@phosphor-icons/react/dist/ssr/Crown';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { metricKindToConversationKind, startConversationWithMember } from '@/lib/conversations-client';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import {
  fetchListingSavers,
  type ListingMetricKind,
  type ListingSaverLead,
} from '@/lib/listing-metrics';
import { paths, pathsPublicMemberProfile } from '@/paths';
import { productButtonSx } from '@/styles/product-sx';

function formatSavedAt(iso: string): string {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '';
  try {
    return new Intl.DateTimeFormat('sq-AL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(ms);
  } catch {
    return '';
  }
}

export function ListingSavesLeadsDialog({
  open,
  onClose,
  listingKind,
  listingId,
  listingTitle,
}: {
  open: boolean;
  onClose: () => void;
  listingKind: ListingMetricKind;
  listingId: string;
  listingTitle?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [savers, setSavers] = React.useState<ListingSaverLead[]>([]);
  const [total, setTotal] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [packageRequired, setPackageRequired] = React.useState(false);
  const [contactingId, setContactingId] = React.useState<string | null>(null);
  const [contactError, setContactError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !listingId || !listingKind) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPackageRequired(false);
    setContactError(null);
    setSavers([]);
    setTotal(0);

    void fetchListingSavers(listingKind, listingId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.code === 'PACKAGE_REQUIRED') {
        setPackageRequired(true);
        setError(res.error ?? null);
        return;
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      setSavers(res.savers ?? []);
      setTotal(res.total ?? res.savers?.length ?? 0);
    });

    return () => {
      cancelled = true;
    };
  }, [open, listingId, listingKind]);

  const handleContact = async (memberId: string) => {
    if (contactingId) return;
    setContactError(null);
    setContactingId(memberId);
    try {
      const res = await startConversationWithMember(memberId, {
        listingKind: metricKindToConversationKind(listingKind),
        listingId,
      });
      if (res.error || !res.conversation?.id) {
        setContactError(res.error || 'Nuk u hap biseda.');
        return;
      }
      onClose();
      router.push(`${paths.user.messages}?c=${encodeURIComponent(res.conversation.id)}`);
    } finally {
      setContactingId(null);
    }
  };

  return (
    <ProductDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <ProductDialogTitle onClose={onClose}>
        Interesuarit · ruajtje
      </ProductDialogTitle>
      <ProductDialogContent>
        {listingTitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 650 }}>
            {listingTitle}
          </Typography>
        ) : null}

        {loading ? (
          <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : packageRequired ? (
          <Stack spacing={2} sx={{ py: 1 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: primaryMainAlpha(0.08),
              }}
            >
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: primaryMainAlpha(0.18),
                    color: 'primary.main',
                    flexShrink: 0,
                  }}
                >
                  <CrownIcon size={22} weight="duotone" />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                    Vetëm me Grow ose Elite
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 550 }}>
                    Shiko kush e ka ruajtur njoftimin dhe kontaktoi si lead — i disponueshëm me
                    paketën Grow ose Elite.
                  </Typography>
                </Box>
              </Stack>
            </Box>
            {error ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            ) : null}
          </Stack>
        ) : error ? (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        ) : savers.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Ende askush nuk e ka ruajtur këtë njoftim.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {total} {total === 1 ? 'person i interesuar' : 'persona të interesuar'}
            </Typography>
            {contactError ? (
              <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setContactError(null)}>
                {contactError}
              </Alert>
            ) : null}
            {savers.map((saver) => (
              <Stack
                key={saver.id}
                direction="row"
                spacing={1.25}
                sx={{
                  alignItems: 'center',
                  p: 1.25,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Avatar
                  src={saver.avatarUrl || undefined}
                  alt=""
                  sx={{ width: 44, height: 44, bgcolor: primaryMainAlpha(0.16), color: 'primary.main' }}
                >
                  <UserIcon size={22} weight="duotone" />
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    component="a"
                    href={pathsPublicMemberProfile(saver.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: 'text.primary',
                      textDecoration: 'none',
                      display: 'block',
                      '&:hover': { color: 'primary.main' },
                    }}
                    noWrap
                  >
                    {saver.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>
                    Ruajti {formatSavedAt(saver.savedAt)}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  disabled={Boolean(contactingId)}
                  onClick={() => {
                    void handleContact(saver.id);
                  }}
                  startIcon={
                    contactingId === saver.id ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <ChatsIcon size={16} weight="bold" />
                    )
                  }
                  sx={{
                    ...productButtonSx,
                    flexShrink: 0,
                    textTransform: 'none',
                    fontWeight: 800,
                    borderRadius: 2,
                    px: 1.25,
                  }}
                >
                  Kontakto
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </ProductDialogContent>
      <ProductDialogActions>
        {packageRequired ? (
          <Button
            variant="contained"
            color="primary"
            href={paths.user.packagesMain}
            component="a"
            sx={{ ...productButtonSx, textTransform: 'none', fontWeight: 800 }}
          >
            Shiko paketat Grow / Elite
          </Button>
        ) : (
          <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Mbyll
          </Button>
        )}
      </ProductDialogActions>
    </ProductDialog>
  );
}
