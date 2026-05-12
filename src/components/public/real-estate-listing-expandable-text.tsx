'use client';

import * as React from 'react';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const COLLAPSED_LEN = 480;

export function RealEstateListingExpandableText(props: {
  text: string;
  /** When omitted, follows MUI `text.primary` (light/dark shells). */
  color?: string;
}) {
  const { text, color = 'text.primary' } = props;
  const [open, setOpen] = React.useState(false);

  const long = text.length > COLLAPSED_LEN;
  const shown = open || !long ? text : `${text.slice(0, COLLAPSED_LEN).trim()}…`;

  return (
    <Stack spacing={1}>
      <Typography
        component="div"
        variant="body1"
        sx={{
          color,
          lineHeight: 1.75,
          whiteSpace: 'pre-wrap',
          fontWeight: 400,
          opacity: 0.94,
        }}
      >
        {shown}
      </Typography>
      {long ? (
        <Link
          component="button"
          type="button"
          variant="body2"
          onClick={() => setOpen(!open)}
          underline="none"
          sx={{
            cursor: 'pointer',
            alignSelf: 'flex-start',
            fontWeight: 700,
            color: 'primary.main',
            typography: 'body2',
            border: 'none',
            bgcolor: 'transparent',
            padding: 0,
            '&:hover': { color: 'primary.light' },
          }}
        >
          {open ? 'Shfaq më pak' : 'Shfaq më shumë'}
        </Link>
      ) : null}
    </Stack>
  );
}
