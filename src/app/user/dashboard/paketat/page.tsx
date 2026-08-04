'use client';

import * as React from 'react';
import { alpha, type Theme } from '@mui/material/styles';
import { Box, Stack, Typography } from '@mui/material';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { hardNavigate } from '@/lib/hard-navigate';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';

const CATEGORIES: {
  href: string;
  title: string;
  description: string;
  icon: PhosphorIcon;
  accent: string;
}[] = [
  {
    href: paths.user.packagesMain,
    title: 'Paketat kryesore',
    description: 'Planet e abonimit — FREE, STARTER, GROW dhe ELITE.',
    icon: PackageIcon,
    accent: '#7ac943',
  },
  {
    href: paths.user.packagesExtra,
    title: 'Paketat shtesë',
    description: 'Auto-refresh, premium listing dhe konvertim me Boost Coins.',
    icon: SquaresFourIcon,
    accent: '#f5a623',
  },
  {
    href: paths.user.packagesCredits,
    title: 'Bli Boost Coins',
    description: 'Bleni kredite për të promovuar njoftimet tuaja.',
    icon: CoinsIcon,
    accent: '#3ec6e0',
  },
];

function PackageCategoryCard({
  href,
  title,
  description,
  icon: Icon,
  accent,
}: (typeof CATEGORIES)[number]) {
  return (
    <Box
      component="a"
      href={href}
      onClick={(event) => hardNavigate(href, event)}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 2.5, sm: 2.75 },
        pl: { xs: 3, sm: 3.25 },
        borderRadius: 3.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 14,
          bottom: 14,
          width: 4,
          borderRadius: '0 4px 4px 0',
          bgcolor: accent,
        },
        '&:hover': {
          borderColor: (t: Theme) => alpha(accent, 0.45),
          bgcolor: (t: Theme) =>
            t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'action.hover',
          transform: 'translateY(-1px)',
        },
        '&:active': { transform: 'translateY(0)' },
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: (t) => alpha(accent, t.palette.mode === 'dark' ? 0.16 : 0.12),
            color: accent,
          }}
        >
          {React.createElement(Icon, { size: 28, weight: 'duotone' })}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.12rem', sm: '1.18rem' },
              lineHeight: 1.25,
              letterSpacing: '-0.015em',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, lineHeight: 1.45 }}
          >
            {description}
          </Typography>
        </Box>

        <Box sx={{ color: 'text.secondary', display: 'flex', flexShrink: 0, opacity: 0.65 }}>
          <CaretRightIcon size={22} weight="bold" />
        </Box>
      </Stack>
    </Box>
  );
}

export default function UserPackagesPage() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <UserPageHeader
        icon={<PackageIcon size={20} weight="duotone" />}
        title="Paketat për ju"
        description="Planet kryesore, shtesat dhe blerja e Boost Coins."
      />

      <Stack spacing={1.75}>
        {CATEGORIES.map((category) => (
          <PackageCategoryCard key={category.href} {...category} />
        ))}
      </Stack>
    </Stack>
  );
}
