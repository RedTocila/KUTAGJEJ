'use client';

import * as React from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import { ChatCircleDots as ChatCircleDotsIcon } from '@phosphor-icons/react/dist/ssr/ChatCircleDots';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { MemberLeaveReviewButton } from '@/components/public/member-leave-review-button';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { useUser } from '@/hooks/use-user';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { formatRatingDisplay } from '@/lib/format-rating';
import { listMemberReviews, type MemberReview } from '@/lib/member-reviews-client';

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

  useLockBodyScroll(open);

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
      ? formatRatingDisplay(ratingAverage)
      : reviews.length > 0
        ? formatRatingDisplay(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
        : formatRatingDisplay(0);

  const title = memberName?.trim() ? `Vlerësimet · ${memberName.trim()}` : 'Vlerësimet';

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      disableScrollLock
      slotProps={{
        backdrop: {
          sx: {
            pointerEvents: 'auto',
            touchAction: 'none',
          },
        },
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '70dvh',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            backgroundImage: 'none',
            pb: 'env(safe-area-inset-bottom, 0px)',
            zIndex: (theme) => theme.zIndex.modal + 1,
          },
        },
      }}
    >
      <Box sx={{ px: 2, pt: 1, pb: showLeaveReview ? 1.5 : 2 }}>
        <Box
          sx={{
            width: 36,
            height: 4,
            borderRadius: 999,
            bgcolor: 'action.disabled',
            mx: 'auto',
            mb: 1.25,
          }}
        />

        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', pr: 1 }} noWrap>
            {title}
          </Typography>
          <IconButton aria-label="Mbyll" onClick={onClose} size="small" edge="end">
            <XIcon size={18} weight="bold" />
          </IconButton>
        </Stack>

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
            <Stack spacing={1.25} sx={{ pb: showLeaveReview ? 0.5 : 0 }}>
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
                      {review.listingTitle ? (
                        <Typography
                          sx={{ fontSize: '0.6875rem', color: 'text.disabled', fontWeight: 650 }}
                        >
                          Në shpalljen · {review.listingTitle}
                        </Typography>
                      ) : null}
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

          {showLeaveReview ? (
            <Box sx={{ width: '100%', pt: 0.25 }}>
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
          ) : null}
        </Stack>
      </Box>
    </Drawer>
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
