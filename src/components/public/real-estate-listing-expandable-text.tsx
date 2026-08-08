'use client';

import * as React from 'react';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { emitHotLeadDetailsExpand } from '@/lib/listing-hot-lead';

const COLLAPSED_LEN = 480;

export function RealEstateListingExpandableText(props: {
  text: string;
  /** When omitted, follows MUI `text.primary` (light/dark shells). */
  color?: string;
  readMoreLabel?: string;
  readLessLabel?: string;
  fontSize?: string | number;
  /** Collapse by CSS line clamp instead of character count. */
  maxLines?: number;
}) {
  const {
    text,
    color = 'text.primary',
    readMoreLabel = 'Shfaq më shumë',
    readLessLabel = 'Shfaq më pak',
    fontSize,
    maxLines,
  } = props;
  const [open, setOpen] = React.useState(false);
  const [clamped, setClamped] = React.useState(false);
  const textRef = React.useRef<HTMLDivElement | null>(null);

  const useLineClamp = typeof maxLines === 'number' && maxLines > 0;
  const longByChars = !useLineClamp && text.length > COLLAPSED_LEN;
  const shown = useLineClamp || open || !longByChars ? text : `${text.slice(0, COLLAPSED_LEN).trim()}…`;

  React.useEffect(() => {
    if (!useLineClamp || open) {
      setClamped(false);
      return undefined;
    }
    const el = textRef.current;
    if (!el) return undefined;
    const measure = () => {
      setClamped(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [text, useLineClamp, open, maxLines, fontSize]);

  const showToggle = useLineClamp ? open || clamped : longByChars;

  return (
    <Stack spacing={0.75}>
      <Typography
        ref={textRef}
        component="div"
        variant="body1"
        sx={{
          color,
          lineHeight: 1.65,
          whiteSpace: useLineClamp && !open ? 'normal' : 'pre-wrap',
          fontWeight: 400,
          opacity: 0.94,
          ...(fontSize != null ? { fontSize } : {}),
          ...(useLineClamp && !open
            ? {
                display: '-webkit-box',
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : null),
        }}
      >
        {shown}
      </Typography>
      {showToggle ? (
        <Link
          component="button"
          type="button"
          variant="body2"
          onClick={() => {
            if (!open) emitHotLeadDetailsExpand();
            setOpen(!open);
          }}
          underline="none"
          sx={{
            cursor: 'pointer',
            alignSelf: 'flex-start',
            fontWeight: 700,
            color: 'primary.main',
            typography: 'body2',
            ...(fontSize != null ? { fontSize } : {}),
            border: 'none',
            bgcolor: 'transparent',
            padding: 0,
            '&:hover': { color: 'primary.light' },
          }}
        >
          {open ? readLessLabel : readMoreLabel}
        </Link>
      ) : null}
    </Stack>
  );
}
