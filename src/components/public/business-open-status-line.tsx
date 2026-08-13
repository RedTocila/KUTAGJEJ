'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

type BusinessOpenStatusLineProps = {
  statusLine: string;
  fontSize?: string | number;
  endAdornment?: React.ReactNode;
};

function parseOpenStatus(statusLine: string): {
  isOpen: boolean;
  isClosed: boolean;
  primary: string;
  secondary: string | null;
} {
  const trimmed = statusLine.trim();
  const closedMatch = /^Mbyllur(?:\s*[•·]\s*(.+))?$/i.exec(trimmed);
  if (closedMatch) {
    return {
      isOpen: false,
      isClosed: true,
      primary: 'Mbyllur',
      secondary: closedMatch[1]?.trim() || null,
    };
  }
  const openMatch = /^Hapur(?:\s*[•·]\s*(.+))?$/i.exec(trimmed);
  if (openMatch) {
    return {
      isOpen: true,
      isClosed: false,
      primary: 'Hapur',
      secondary: openMatch[1]?.trim() || null,
    };
  }
  return {
    isOpen: false,
    isClosed: false,
    primary: trimmed,
    secondary: null,
  };
}

/** Dot + open/closed line with red accents for closed status or closing time. */
export function BusinessOpenStatusLine({
  statusLine,
  fontSize = '0.8rem',
  endAdornment,
}: BusinessOpenStatusLineProps): React.JSX.Element {
  const { isOpen, isClosed, primary, secondary } = parseOpenStatus(statusLine);
  const accentColor = 'error.main';
  const calmColor = 'primary.main';
  const dotColor = isClosed ? accentColor : calmColor;

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: dotColor,
          boxShadow: (theme) =>
            `0 0 0 3px ${alpha(isClosed ? theme.palette.error.main : theme.palette.primary.main, 0.25)}`,
        }}
      />
      <Typography sx={{ fontSize, fontWeight: 600, color: calmColor }}>
        <Box component="span" sx={{ color: isClosed ? accentColor : calmColor }}>
          {primary}
        </Box>
        {secondary ? (
          <>
            {' • '}
            <Box component="span" sx={{ color: isOpen ? accentColor : calmColor }}>
              {secondary}
            </Box>
          </>
        ) : null}
      </Typography>
      {endAdornment}
    </Stack>
  );
}
