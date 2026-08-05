'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { listBusinessReviews, submitBusinessReview, type BusinessReview } from '@/lib/business-reviews-client';
import { formatRatingDisplay } from '@/lib/format-rating';
import { ProfessionalFiveStarRating } from '@/components/public/professional-listing-detail-ui';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';
import { productButtonSx, productFieldSx } from '@/styles/product-sx';
import { ProductTag } from '@/components/public/product-browse-chrome';

const REVIEWS_PAGE_SIZE = 10;
const STAR_FILTERS = [5, 4, 3, 2, 1] as const;

function useBusinessReviews(listingId: string, onReviewSubmitted?: () => void) {
  const router = useRouter();
  const { user } = useUser();
  const [reviews, setReviews] = React.useState<BusinessReview[]>([]);
  const [viewerHasReviewed, setViewerHasReviewed] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState<number | null>(5);
  const [comment, setComment] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await listBusinessReviews(listingId);
    if (!res.error) {
      setReviews(res.reviews ?? []);
      setViewerHasReviewed(Boolean(res.viewerHasReviewed));
    }
  }, [listingId]);

  React.useEffect(() => {
    void load();
  }, [load, user?.id]);

  const openDialog = () => {
    if (!user) {
      router.push(
        `${paths.user.auth}?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : paths.public.businesses)}`,
      );
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
    const res = await submitBusinessReview(listingId, rating, comment);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    setComment('');
    setRating(5);
    setViewerHasReviewed(true);
    await load();
    onReviewSubmitted?.();
  };

  return {
    reviews,
    viewerHasReviewed,
    open,
    setOpen,
    rating,
    setRating,
    comment,
    setComment,
    error,
    submitting,
    openDialog,
    submit,
  };
}

function LeaveReviewDialog({
  open,
  onClose,
  rating,
  onRatingChange,
  comment,
  onCommentChange,
  error,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  rating: number | null;
  onRatingChange: (v: number | null) => void;
  comment: string;
  onCommentChange: (v: string) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <ProductDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <ProductDialogTitle onClose={onClose}>Vlerësoni biznesin</ProductDialogTitle>
      <ProductDialogContent>
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
              sx={{ mb: 1.25, fontWeight: 600, fontSize: '0.8125rem' }}
            >
              Sa yje i jepni?
            </Typography>
            <Rating
              value={rating}
              onChange={(_, v) => onRatingChange(v)}
              size="large"
              sx={{
                fontSize: '2.75rem',
                gap: 0.5,
                '& .MuiRating-iconFilled': { color: 'warning.main' },
                '& .MuiRating-iconHover': { color: 'warning.main' },
              }}
            />
          </Box>
          <TextField
            label="Komenti (opsionale)"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            sx={productFieldSx}
          />
        </Stack>
      </ProductDialogContent>
      <ProductDialogActions>
        <Button
          variant="contained"
          disabled={submitting}
          onClick={onSubmit}
          sx={{ ...productButtonSx, px: 2.5 }}
        >
          Dërgo
        </Button>
      </ProductDialogActions>
    </ProductDialog>
  );
}

function reviewerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function StarFilterTags({
  active,
  counts,
  onSelect,
}: {
  active: number | 'all';
  counts: Record<number, number>;
  onSelect: (value: number | 'all') => void;
}) {
  const options: Array<{ value: number | 'all'; label: string; count: number }> = [
    {
      value: 'all',
      label: 'Të gjitha',
      count: STAR_FILTERS.reduce((sum, star) => sum + (counts[star] ?? 0), 0),
    },
    ...STAR_FILTERS.map((star) => ({
      value: star,
      label: `${star}`,
      count: counts[star] ?? 0,
    })),
  ];

  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        overflowX: 'auto',
        mx: -0.25,
        px: 0.25,
        pb: 0.25,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {options.map((option) => {
        const isActive = option.value === active;
        const disabled = option.count === 0 && option.value !== 'all';
        return (
          <ProductTag
            key={String(option.value)}
            label={
              option.value === 'all' ? (
                option.label
              ) : (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
                  <Box component="span">{option.label}</Box>
                  <StarIcon size={12} weight="fill" />
                </Box>
              )
            }
            active={isActive}
            onClick={disabled ? undefined : () => onSelect(option.value)}
            sx={{
              opacity: disabled ? 0.4 : 1,
              cursor: disabled ? 'default' : 'pointer',
              pointerEvents: disabled ? 'none' : 'auto',
            }}
          />
        );
      })}
    </Stack>
  );
}

function ReviewCard({ review }: { review: BusinessReview }) {
  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.018)',
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            fontWeight: 800,
            fontSize: '0.8rem',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
            color: 'primary.main',
          }}
        >
          {reviewerInitials(review.reviewerName)}
        </Avatar>
        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}
          >
            <Stack spacing={0.2} sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {review.reviewerName}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600 }}>
                {new Date(review.createdAt).toLocaleDateString('sq-AL')}
              </Typography>
            </Stack>
            <Box
              sx={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.4,
                px: 0.85,
                py: 0.35,
                borderRadius: 999,
                bgcolor: (theme) => alpha(theme.palette.warning.main, 0.12),
                color: 'warning.main',
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', lineHeight: 1 }}>
                {review.rating}
              </Typography>
              <StarIcon size={12} weight="fill" />
            </Box>
          </Stack>
          <ProfessionalFiveStarRating value={review.rating} size={14} />
          {review.comment ? (
            <Typography
              sx={{
                fontSize: '0.8125rem',
                color: 'text.secondary',
                lineHeight: 1.5,
                mt: 0.15,
              }}
            >
              {review.comment}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}

export function BusinessReviewSection({
  listingId,
  ratingAverage,
  reviewCount,
  onReviewSubmitted,
  variant = 'full',
}: {
  listingId: string;
  ratingAverage: number | null | undefined;
  reviewCount: number | undefined;
  onReviewSubmitted?: () => void;
  /** `summary` = stars + leave button; `list` = review cards; `full` = both. */
  variant?: 'summary' | 'list' | 'full';
}) {
  const {
    reviews,
    viewerHasReviewed,
    open,
    setOpen,
    rating,
    setRating,
    comment,
    setComment,
    error,
    submitting,
    openDialog,
    submit,
  } = useBusinessReviews(listingId, onReviewSubmitted);

  const [visibleCount, setVisibleCount] = React.useState(REVIEWS_PAGE_SIZE);
  const [starFilter, setStarFilter] = React.useState<number | 'all'>('all');

  React.useEffect(() => {
    setVisibleCount(REVIEWS_PAGE_SIZE);
    setStarFilter('all');
  }, [listingId]);

  const starCounts = React.useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const review of reviews) {
      const star = Math.round(Number(review.rating));
      if (star >= 1 && star <= 5) counts[star] += 1;
    }
    return counts;
  }, [reviews]);

  const filteredReviews = React.useMemo(
    () => (starFilter === 'all' ? reviews : reviews.filter((r) => Math.round(Number(r.rating)) === starFilter)),
    [reviews, starFilter],
  );

  const count = reviewCount ?? 0;
  const avgValue = ratingAverage != null && Number.isFinite(Number(ratingAverage)) ? Number(ratingAverage) : 0;
  const avgLabel = count > 0 ? formatRatingDisplay(avgValue) : null;
  const showSummary = variant === 'summary' || variant === 'full';
  const showList = variant === 'list' || variant === 'full';
  const visibleReviews = filteredReviews.slice(0, visibleCount);
  const hasMoreReviews = visibleCount < filteredReviews.length;
  const showLeaveReview = !viewerHasReviewed;

  const handleStarFilter = (value: number | 'all') => {
    setStarFilter(value);
    setVisibleCount(REVIEWS_PAGE_SIZE);
  };

  return (
    <Box>
      {showSummary ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
            <ProfessionalFiveStarRating value={avgValue} size={16} />
            {avgLabel ? (
              <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', lineHeight: 1 }}>{avgLabel}</Typography>
            ) : null}
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              ({count} vlerësime)
            </Typography>
          </Stack>
          {showLeaveReview ? (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={openDialog}
              startIcon={<StarIcon size={14} weight="fill" />}
              sx={{
                flexShrink: 0,
                ml: 'auto',
                height: 32,
                minHeight: 32,
                px: 1.25,
                py: 0,
                borderRadius: 999,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '0.75rem',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                borderWidth: 1.5,
                '& .MuiButton-startIcon': { mr: 0.5 },
              }}
            >
              Lini vlerësim
            </Button>
          ) : null}
        </Stack>
      ) : null}

      {showList && reviews.length > 0 ? (
        <Stack spacing={1.5} sx={{ mt: showSummary ? 1.25 : 0 }}>
          {variant === 'list' ? (
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Vlerësime</Typography>
          ) : null}

          <StarFilterTags active={starFilter} counts={starCounts} onSelect={handleStarFilter} />

          {visibleReviews.length > 0 ? (
            <Stack spacing={1.25}>
              {visibleReviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', py: 0.5 }}>
              Nuk ka vlerësime me {starFilter} yje.
            </Typography>
          )}

          {hasMoreReviews ? (
            <Button
              variant="text"
              endIcon={<ArrowRightIcon size={16} weight="bold" />}
              onClick={() => setVisibleCount((n) => n + REVIEWS_PAGE_SIZE)}
              sx={{
                alignSelf: 'flex-start',
                px: 0,
                minWidth: 0,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '0.875rem',
                color: 'primary.main',
                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
              }}
            >
              Shiko më shumë
            </Button>
          ) : null}
        </Stack>
      ) : null}

      {showSummary && showLeaveReview ? (
        <LeaveReviewDialog
          open={open}
          onClose={() => setOpen(false)}
          rating={rating}
          onRatingChange={setRating}
          comment={comment}
          onCommentChange={setComment}
          error={error}
          submitting={submitting}
          onSubmit={() => void submit()}
        />
      ) : null}
    </Box>
  );
}
