'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import { BusinessOwnerReservations } from '@/components/businesses/business-owner-reservations';
import { BusinessListingForm } from '@/components/businesses/business-listing-form';
import { PostListingAiAssist } from '@/components/user/post-listing-ai-assist';
import { hardNavigate } from '@/lib/hard-navigate';
import { paths } from '@/paths';

type Tab = 'post' | 'reservations';

const tabBtnSx = (active: boolean) => ({
  flex: { xs: '1 1 auto', sm: '0 0 auto' },
  minHeight: 40,
  px: 1.75,
  textTransform: 'none' as const,
  fontWeight: 800,
  borderRadius: 2.5,
  boxShadow: 'none',
  border: '1.5px solid',
  borderColor: active ? 'primary.main' : 'divider',
  bgcolor: active ? 'primary.main' : 'transparent',
  color: active ? 'primary.contrastText' : 'text.secondary',
  '&:hover': {
    boxShadow: 'none',
    borderColor: 'primary.main',
    bgcolor: active ? 'primary.dark' : 'action.hover',
    color: active ? 'primary.contrastText' : 'text.primary',
  },
});

export default function UserBusinessesDashboardPage() {
  const [tab, setTab] = React.useState<Tab>('post');
  const [aiPrefill, setAiPrefill] = React.useState<Record<string, unknown> | null>(null);
  const [aiFormKey, setAiFormKey] = React.useState(0);

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Biznese
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Menaxhoni profilin e lokalit, orarin dhe rezervimet. Menunë e shtoni nga Shpalljet e mia.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          p: 0.75,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'action.hover',
        }}
      >
        <Button
          variant="contained"
          startIcon={<PencilSimpleIcon size={16} weight="bold" />}
          onClick={() => setTab('post')}
          sx={tabBtnSx(tab === 'post')}
        >
          Posto / përditëso
        </Button>
        <Button
          variant="outlined"
          startIcon={<CalendarBlankIcon size={16} weight="bold" />}
          onClick={() => setTab('reservations')}
          sx={tabBtnSx(tab === 'reservations')}
        >
          Rezervimet
        </Button>
        <Button
          component={Link}
          href={paths.user.realEstateListing}
          variant="outlined"
          startIcon={<PlusIcon size={16} weight="bold" />}
          sx={{
            ...tabBtnSx(false),
            ml: { sm: 'auto' },
          }}
        >
          Të gjitha kategoritë
        </Button>
      </Box>

      {tab === 'post' ? (
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={2.25}>
              <PostListingAiAssist
                category="businesses"
                onApply={(initial) => {
                  setAiPrefill(initial);
                  setAiFormKey((k) => k + 1);
                }}
              />
              <BusinessListingForm
                key={`biz-${aiFormKey}`}
                aiPrefill={aiPrefill}
                onSuccess={() => {
                  hardNavigate(paths.user.dashboard);
                }}
                backHref={paths.user.dashboard}
                backLabel="Profili"
              />
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <BusinessOwnerReservations />
      )}
    </Stack>
  );
}
