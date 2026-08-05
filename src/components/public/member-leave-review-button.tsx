'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { listMemberReviews, submitMemberReview } from '@/lib/member-reviews-client';
import { useUser } from '@/hooks/use-user';
import { paths, pathsPublicMemberProfile } from '@/paths';
import { productButtonSx, productDialogPaperSx, productDialogSlotProps, productFieldSx } from '@/styles/product-sx';

const DIALOG_Z_INDEX = 1400;

export function MemberLeaveReviewButton({
  memberId,
  memberName,
  compact = false,
  fullWidth = true,
  dialogZIndex = DIALOG_Z_INDEX,
  onSubmitted,
  /** When provided by parent, skips the internal has-reviewed fetch. */
  hasReviewed: hasReviewedProp,
}: {
  memberId: string;
  memberName?: string;
  pill?: boolean;
  /** Smaller outlined control for tight layouts (seller cards). */
  compact?: boolean;
  fullWidth?: boolean;
  /** Raise above another dialog (e.g. reviews list). */
  dialogZIndex?: number;
  onSubmitted?: () => void;
  hasReviewed?: boolean;
}) {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState<number | null>(5);
  const [comment, setComment] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [hasReviewedInternal, setHasReviewedInternal] = React.useState(false);

  const isOwnProfile = Boolean(user?.id && String(user.id) === String(memberId));
  const hasReviewed = hasReviewedProp ?? hasReviewedInternal;

  React.useEffect(() => {
    if (!memberId || hasReviewedProp != null || !user?.id || isOwnProfile) return;
    let cancelled = false;
    void listMemberReviews(memberId).then((res) => {
      if (!cancelled && res.viewerHasReviewed) setHasReviewedInternal(true);
    });
    return () => {
      cancelled = true;
    };
  }, [memberId, user?.id, isOwnProfile, hasReviewedProp]);

  const openDialog = () => {
    if (isLoading) return;

    if (!user) {
      const redirect =
        typeof window !== 'undefined' ? window.location.pathname : pathsPublicMemberProfile(memberId);
      router.push(`${paths.user.auth}?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    if (!rating) {
      setError('Zgjidhni vlerësimin.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await submitMemberReview(memberId, rating, comment);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    setComment('');
    setRating(5);
    setHasReviewedInternal(true);
    onSubmitted?.();
  };

  const closeDialog = () => {
    setOpen(false);
    setError(null);
  };

  if (!memberId || isOwnProfile || hasReviewed) return null;

  const title = memberName?.trim() ? `Vlerësoni ${memberName.trim()}` : 'Lini vlerësim';

  return (
    <>
      <Button
        fullWidth={fullWidth}
        size={compact ? 'small' : 'medium'}
        variant="outlined"
        color="primary"
        onClick={openDialog}
        startIcon={<StarIcon size={compact ? 16 : 18} weight="fill" />}
        sx={{
          fontWeight: 800,
          textTransform: 'none',
          flexShrink: 0,
          borderRadius: 999,
          height: compact ? 36 : 44,
          minHeight: compact ? 36 : 44,
          px: compact ? 1.25 : 1.5,
          py: 0,
          fontSize: '0.8125rem',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          minWidth: 0,
          '& .MuiButton-startIcon': { mr: 0.75, flexShrink: 0 },
        }}
      >
        Lini vlerësim
      </Button>

      <Dialog
        open={open}
        onClose={closeDialog}
        maxWidth="xs"
        fullWidth
        disableScrollLock={false}
        slotProps={{
          backdrop: {
            sx: {
              ...productDialogSlotProps.backdrop.sx,
              pointerEvents: 'auto',
            },
          },
          paper: {
            elevation: 0,
            sx: productDialogPaperSx,
          },
        }}
        sx={{ zIndex: dialogZIndex }}
      >
        <DialogTitle
          sx={{
            position: 'relative',
            px: 2.5,
            pt: 2.5,
            pb: 1,
            pr: 6,
            fontWeight: 800,
            fontSize: '1.125rem',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
          <IconButton
            aria-label="Mbyll"
            onClick={closeDialog}
            size="small"
            sx={{
              position: 'absolute',
              right: 12,
              top: 12,
              color: 'text.secondary',
              borderRadius: 2,
              '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
            }}
          >
            <XIcon size={18} weight="bold" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 2.5, pb: 1.5, pt: '8px !important' }}>
          <Stack spacing={2.25}>
            {error ? (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            ) : null}
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1, fontWeight: 600, fontSize: '0.8125rem' }}
              >
                Sa yje i jepni?
              </Typography>
              <Rating value={rating} onChange={(_, v) => setRating(v)} size="large" />
            </Box>
            <TextField
              label="Komenti (opsional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              sx={productFieldSx}
            />
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.5,
            pb: 2.5,
            pt: 1,
          }}
        >
          <Button
            variant="contained"
            disabled={submitting}
            onClick={() => void submit()}
            sx={{ ...productButtonSx, px: 2.5 }}
          >
            Dërgo
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
