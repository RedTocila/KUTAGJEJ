'use client';

import * as React from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import { ChatCircleDots as ChatCircleDotsIcon } from '@phosphor-icons/react/dist/ssr/ChatCircleDots';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { MemberLeaveReviewButton } from '@/components/public/member-leave-review-button';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { listMemberReviews, type MemberReview } from '@/lib/member-reviews-client';
import { useUser } from '@/hooks/use-user';

const DIALOG_Z_INDEX = 1400;
const LEAVE_REVIEW_Z_INDEX = 1500;

function reviewerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function MemberReviewsDialog({
  memberId,
  memberName,
  open,
  onClose,
  ratingAverage,
  reviewCount,
  onReviewSubmitted,
}: {
  memberId: string;
  memberName?: string;
  open: boolean;
  onClose: () => void;
  ratingAverage?: number | null;
  reviewCount?: number;
  onReviewSubmitted?: () => void;
}) {
  const { user } = useUser();
  const [reviews, setReviews] = React.useState<MemberReview[]>([]);
  const [viewerHasReviewed, setViewerHasReviewed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const isOwnProfile = Boolean(user?.id && String(user.id) === String(memberId));
  const showLeaveReview = !isOwnProfile && !viewerHasReviewed;

  const loadReviews = React.useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    setError(null);
    const res = await listMemberReviews(memberId);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setReviews([]);
      setViewerHasReviewed(false);
      return;
    }
    setReviews(res.reviews ?? []);
    setViewerHasReviewed(Boolean(res.viewerHasReviewed));
  }, [memberId]);

  React.useEffect(() => {
    if (!open || !memberId) return;
    void loadReviews();
  }, [open, memberId, reloadKey, loadReviews]);

  const count = Math.max(reviewCount ?? 0, reviews.length);
  const avgLabel =
    ratingAverage != null && Number.isFinite(ratingAverage)
      ? ratingAverage.toFixed(1)
      : reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : '0.0';

  const title = memberName?.trim() ? `Vlerësimet · ${memberName.trim()}` : 'Vlerësimet';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      disableScrollLock={false}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.62)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            pointerEvents: 'auto',
          },
        },
      }}
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflow: 'hidden',
          mx: 2,
          backgroundImage: 'none',
          maxHeight: 'min(80vh, 640px)',
        },
      }}
      sx={{ zIndex: DIALOG_Z_INDEX }}
    >
      <DialogTitle
        sx={{
          position: 'relative',
          px: 2.5,
          pt: 2.25,
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
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
          }}
        >
          <XIcon size={18} weight="bold" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pb: showLeaveReview ? 1.5 : 2.5, pt: '8px !important' }}>
        <Stack spacing={2}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              px: 1.5,
              py: 1.25,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <StarIcon size={18} weight="fill" color="var(--mui-palette-warning-main)" />
            <Typography sx={{ fontWeight: 850, fontSize: '1.05rem', lineHeight: 1 }}>{avgLabel}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>
              · {count} {count === 1 ? 'vlerësim' : 'vlerësime'}
            </Typography>
          </Stack>

          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : error ? (
            <Typography variant="body2" color="error" sx={{ fontWeight: 600 }}>
              {error}
            </Typography>
          ) : reviews.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, py: 1 }}>
              Ende pa vlerësime. Bëhuni i pari që lini një koment.
            </Typography>
          ) : (
            <Stack spacing={1.25} sx={{ maxHeight: 'min(48vh, 420px)', overflowY: 'auto', pr: 0.25 }}>
              {reviews.map((review) => (
                <Box
                  key={review.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  }}
                >
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.18 : 0.12),
                        color: 'primary.main',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                      }}
                    >
                      {reviewerInitials(review.reviewerName)}
                    </Avatar>
                    <Stack spacing={0.6} sx={{ flex: 1, minWidth: 0 }}>
                      <Stack
                        direction="row"
                        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                      >
                        <Typography sx={{ fontWeight: 800, fontSize: '0.8125rem' }} noWrap>
                          {review.reviewerName}
                        </Typography>
                        <Typography
                          sx={{ fontSize: '0.6875rem', color: 'text.disabled', flexShrink: 0, fontWeight: 600 }}
                        >
                          {new Date(review.createdAt).toLocaleDateString('sq-AL')}
                        </Typography>
                      </Stack>
                      <Rating value={review.rating} readOnly size="small" />
                      {review.comment ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: '0.8125rem', lineHeight: 1.45, fontWeight: 500 }}
                        >
                          {review.comment}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>

      {showLeaveReview ? (
        <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 1 }}>
          <Box sx={{ width: '100%' }}>
            <MemberLeaveReviewButton
              memberId={memberId}
              memberName={memberName}
              pill
              hasReviewed={viewerHasReviewed}
              dialogZIndex={LEAVE_REVIEW_Z_INDEX}
              onSubmitted={() => {
                setViewerHasReviewed(true);
                setReloadKey((k) => k + 1);
                onReviewSubmitted?.();
              }}
            />
          </Box>
        </DialogActions>
      ) : null}
    </Dialog>
  );
}

export function MemberSeeReviewsButton({
  onClick,
  pill = false,
  fullWidth = true,
  compact = false,
}: {
  onClick: () => void;
  /** @deprecated kept for callers; count shows on the rating summary */
  reviewCount?: number;
  pill?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
}) {
  return (
    <Button
      fullWidth={fullWidth}
      size={compact ? 'small' : 'medium'}
      variant="outlined"
      color="primary"
      onClick={onClick}
      startIcon={<ChatCircleDotsIcon size={compact ? 16 : 18} weight="fill" />}
      sx={{
        fontWeight: 800,
        textTransform: 'none',
        flexShrink: 0,
        borderRadius: pill ? 999 : 2,
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
      Shiko vlerësimet
    </Button>
  );
}
