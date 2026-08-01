'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Stack, Typography } from '@mui/material';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';

const CATEGORIES: {
  href: string;
  title: string;
  description: string;
  icon: PhosphorIcon;
}[] = [
  {
    href: paths.user.packagesMain,
    title: 'Paketat kryesore',
    description: 'Planet e abonimit — FREE, STARTER, GROW dhe ELITE.',
    icon: PackageIcon,
  },
  {
    href: paths.user.packagesExtra,
    title: 'Paketat shtesë',
    description: 'Auto-refresh, premium listing dhe konvertim me Boost Coins.',
    icon: SquaresFourIcon,
  },
  {
    href: paths.user.packagesCredits,
    title: 'Bli Boost Coins',
    description: 'Bleni kredite për të promovuar njoftimet tuaja.',
    icon: CoinsIcon,
  },
];

function CategoryCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: PhosphorIcon;
}) {
  return (
    <Box
      component={RouterLink}
      href={href}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        p: { xs: 2.25, sm: 3 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'action.hover'),
        },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: (t) => `${t.palette.primary.main}22`,
            color: 'primary.main',
          }}
        >
          {React.createElement(Icon, { size: 24, weight: 'duotone' })}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {description}
          </Typography>
        </Box>
        <Box sx={{ color: 'text.secondary', display: 'flex', flexShrink: 0 }}>
          <CaretRightIcon size={20} weight="bold" />
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

      <Stack spacing={2}>
        {CATEGORIES.map((category) => (
          <CategoryCard key={category.href} {...category} />
        ))}
      </Stack>
    </Stack>
  );
}
