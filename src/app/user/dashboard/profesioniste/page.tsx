'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import { ProfessionalListingForm } from '@/components/professionals/professional-listing-form';
import { PostListingAiAssist } from '@/components/user/post-listing-ai-assist';
import { ListingFormSnapshotProvider } from '@/components/user/listing-form-snapshot-context';
import { hardNavigate } from '@/lib/hard-navigate';
import { paths } from '@/paths';

export default function UserProfessionalsDashboardPage() {
  const [aiPrefill, setAiPrefill] = React.useState<Record<string, unknown> | null>(null);

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Profesionistë
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Menaxhoni profilin publik, portofolin dhe orën e përgjigjes.
        </Typography>
      </Stack>

      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Posto / përditëso
            </Typography>
            <Button
              component={Link}
              href={paths.user.realEstateListing}
              variant="outlined"
              size="small"
              startIcon={<PlusIcon size={16} weight="bold" />}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Të gjitha kategoritë
            </Button>
          </Stack>
          <Stack spacing={2.25}>
            <ListingFormSnapshotProvider>
            <PostListingAiAssist
              category="professionals"
              onApply={(initial) => {
                setAiPrefill(initial);
              }}
            />
            <ProfessionalListingForm
              aiPrefill={aiPrefill}
              onSuccess={() => hardNavigate(paths.user.dashboard)}
              backHref={paths.user.dashboard}
              backLabel="Dashboard"
            />
            </ListingFormSnapshotProvider>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
