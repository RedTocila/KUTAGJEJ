import * as React from 'react';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import { Box, Stack, Typography } from '@mui/material';

type JobListingTheme = {
  background: string;
  gradient: string;
  board: string;
  accent: string;
  panel: string;
  panelLabel: string;
};

const THEMES: readonly JobListingTheme[] = [
  {
    background: '#ee8b17',
    gradient:
      'radial-gradient(circle at 50% 43%, rgba(255,237,171,0.55), transparent 35%), linear-gradient(135deg, #e77d0e 0%, #f19a1c 52%, #d96e0d 100%)',
    board: '#080808',
    accent: '#ffea00',
    panel: '#fff7dc',
    panelLabel: '#7a4a08',
  },
  {
    background: '#1976d2',
    gradient:
      'radial-gradient(circle at 50% 38%, rgba(164,224,255,0.5), transparent 37%), linear-gradient(135deg, #0754ae 0%, #2386df 54%, #153c91 100%)',
    board: '#07152e',
    accent: '#d8ff38',
    panel: '#f4ffe8',
    panelLabel: '#31550d',
  },
  {
    background: '#8145c6',
    gradient:
      'radial-gradient(circle at 50% 38%, rgba(255,198,239,0.42), transparent 37%), linear-gradient(135deg, #5f269d 0%, #914bd0 52%, #482077 100%)',
    board: '#201033',
    accent: '#ffdc3e',
    panel: '#fff5d6',
    panelLabel: '#704c00',
  },
  {
    background: '#0d9d98',
    gradient:
      'radial-gradient(circle at 50% 40%, rgba(186,255,226,0.46), transparent 37%), linear-gradient(135deg, #08716f 0%, #12b8a7 52%, #075354 100%)',
    board: '#062e36',
    accent: '#ffe13b',
    panel: '#effffb',
    panelLabel: '#075c5b',
  },
  {
    background: '#e65045',
    gradient:
      'radial-gradient(circle at 50% 42%, rgba(255,224,175,0.5), transparent 36%), linear-gradient(135deg, #b92e39 0%, #ed5a45 54%, #8c1f32 100%)',
    board: '#321318',
    accent: '#f5ff69',
    panel: '#fff0de',
    panelLabel: '#8a2a24',
  },
  {
    background: '#83b51d',
    gradient:
      'radial-gradient(circle at 50% 42%, rgba(244,255,164,0.5), transparent 36%), linear-gradient(135deg, #4c7810 0%, #94c52d 52%, #315c0b 100%)',
    board: '#13210b',
    accent: '#f5f23a',
    panel: '#fffde8',
    panelLabel: '#48620a',
  },
  {
    background: '#d84791',
    gradient:
      'radial-gradient(circle at 50% 40%, rgba(255,208,235,0.48), transparent 36%), linear-gradient(135deg, #a92472 0%, #e1539a 52%, #741b68 100%)',
    board: '#2a0b23',
    accent: '#bfff4a',
    panel: '#fff1fa',
    panelLabel: '#8a2468',
  },
] as const;

type JobListingFallbackProps = {
  position?: string | null;
  salary?: string | null;
  location?: string | null;
  /** Posted listings pass their ID so the selected theme remains stable. */
  seed?: string | null;
};

function themeIndexFromSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % THEMES.length;
}

/**
 * Compact, photo-free job cover inspired by printed hiring posters.
 * All listing details stay live so the artwork is useful in forms and cards.
 */
export function JobListingFallback({ position, salary, location, seed }: JobListingFallbackProps) {
  const role = position?.trim() || 'POZICION I HAPUR';
  const salaryLabel = salary?.trim() || 'Pagë e diskutueshme';
  const locationLabel = location?.trim() || 'Shqipëri';
  const hasSeed = Boolean(seed?.trim());
  const [randomThemeIndex, setRandomThemeIndex] = React.useState(0);

  React.useEffect(() => {
    if (!hasSeed) setRandomThemeIndex(Math.floor(Math.random() * THEMES.length));
  }, [hasSeed]);

  const themeIndex = hasSeed ? themeIndexFromSeed(seed!.trim()) : randomThemeIndex;
  const theme = THEMES[themeIndex] ?? THEMES[0];

  return (
    <Box
      role="img"
      aria-label={`${role}, ${salaryLabel}, ${locationLabel}`}
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        bgcolor: theme.background,
        background: theme.gradient,
        color: theme.board,
        fontFamily: '"Arial Black", Impact, sans-serif',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '7%',
          left: '19%',
          width: '13%',
          aspectRatio: '1',
          border: { xs: 'clamp(5px, 1.2vw, 9px) solid', sm: '9px solid' },
          borderColor: theme.board,
          borderRadius: '50%',
          transform: 'rotate(-10deg)',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: '58%',
            height: { xs: 'clamp(5px, 1.2vw, 9px)', sm: 9 },
            right: '-48%',
            bottom: '-20%',
            bgcolor: theme.board,
            transform: 'rotate(-43deg)',
            transformOrigin: 'left center',
          },
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '13%',
          right: '12%',
          width: 0,
          height: 0,
          borderLeft: '26px solid transparent',
          borderRight: '26px solid transparent',
          borderBottom: `44px solid ${theme.accent}`,
          transform: 'rotate(30deg)',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: '8%',
          bottom: '8%',
          width: 0,
          height: 0,
          borderTop: '18px solid transparent',
          borderBottom: '18px solid transparent',
          borderLeft: `44px solid ${theme.board}`,
          transform: 'rotate(8deg)',
        }}
      />

      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '21%',
          left: '8%',
          right: '8%',
          bottom: '11%',
          bgcolor: theme.board,
          clipPath: 'polygon(0 4%, 100% 0, 93% 100%, 7% 96%)',
          boxShadow: `0 10px 18px ${theme.board}55`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '15%',
          left: '26%',
          right: '23%',
          zIndex: 2,
          px: 1.25,
          py: 0.55,
          bgcolor: theme.accent,
          transform: 'rotate(-1deg)',
          textAlign: 'center',
          boxShadow: `0 4px 0 ${theme.board}22`,
        }}
      >
        <Typography
          component="span"
          sx={{
            display: 'block',
            color: theme.board,
            fontWeight: 950,
            fontSize: 'clamp(0.78rem, 2.8vw, 1.55rem)',
            letterSpacing: '0.08em',
            lineHeight: 1,
          }}
        >
          WE ARE
        </Typography>
      </Box>

      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          top: '28%',
          left: '8%',
          right: '8%',
          zIndex: 1,
          color: theme.accent,
          fontWeight: 950,
          fontSize: 'clamp(1.8rem, 9vw, 5rem)',
          letterSpacing: '-0.06em',
          lineHeight: 0.86,
          textAlign: 'center',
          transform: 'scaleX(0.92)',
        }}
      >
        HIRING
      </Typography>

      <Box
        sx={{
          position: 'absolute',
          top: '41%',
          left: '8%',
          right: '8%',
          bottom: '14%',
          zIndex: 3,
          boxSizing: 'border-box',
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 1.25, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          bgcolor: theme.panel,
          border: `2px solid ${theme.board}`,
          boxShadow: `5px 5px 0 ${theme.board}`,
          transform: 'rotate(1deg)',
          textAlign: 'center',
        }}
      >
        <Typography
          component="span"
          sx={{
            display: 'block',
            mb: 0.5,
            color: theme.panelLabel,
            fontFamily: 'inherit',
            fontWeight: 800,
            fontSize: 'clamp(0.62rem, 2vw, 1rem)',
            letterSpacing: '0.12em',
            lineHeight: 1.1,
          }}
        >
          POZICIONI
        </Typography>
        <Typography
          component="span"
          sx={{
            display: 'block',
            color: theme.board,
            fontFamily: 'inherit',
            fontWeight: 950,
            fontSize: 'clamp(0.96rem, 4vw, 2.2rem)',
            letterSpacing: '-0.035em',
            lineHeight: 1.08,
            overflowWrap: 'anywhere',
          }}
        >
          {role}
        </Typography>
        <Stack
          direction="row"
          spacing={{ xs: 0.7, sm: 1.5 }}
          sx={{
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            mt: 1,
            color: theme.board,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(0.74rem, 2.7vw, 1.2rem)',
            lineHeight: 1.15,
          }}
        >
          <Stack direction="row" spacing={0.3} sx={{ alignItems: 'center', minWidth: 0 }}>
            <PaymentsOutlined sx={{ fontSize: '1em' }} />
            <Typography component="span" sx={{ font: 'inherit', overflowWrap: 'anywhere' }}>
              {salaryLabel}
            </Typography>
          </Stack>
          <Box component="span" aria-hidden sx={{ color: theme.panelLabel }}>
            •
          </Box>
          <Stack direction="row" spacing={0.3} sx={{ alignItems: 'center', minWidth: 0 }}>
            <LocationOnOutlined sx={{ fontSize: '1em' }} />
            <Typography component="span" sx={{ font: 'inherit', overflowWrap: 'anywhere' }}>
              {locationLabel}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          right: '23%',
          bottom: '3%',
          width: '10%',
          aspectRatio: '1',
          border: { xs: 'clamp(5px, 1vw, 8px) solid', sm: '8px solid' },
          borderColor: theme.accent,
          borderRadius: '50%',
          transform: 'rotate(12deg)',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: '72%',
            height: { xs: 'clamp(5px, 1vw, 8px)', sm: 8 },
            right: '-60%',
            bottom: '-25%',
            bgcolor: theme.accent,
            transform: 'rotate(38deg)',
            transformOrigin: 'left center',
          },
        }}
      />
    </Box>
  );
}
