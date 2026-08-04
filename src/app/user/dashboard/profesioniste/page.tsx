'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import { ProfessionalListingForm } from '@/components/professionals/professional-listing-form';
import { ProfessionalVerificationCard } from '@/components/professionals/professional-verification-card';
import { ListingSubmittedPendingAlert } from '@/components/user/listing-moderation-notice';
import { PostListingAiAssist } from '@/components/user/post-listing-ai-assist';
import { paths } from '@/paths';

export default function UserProfessionalsDashboardPage() {
  const [submittedPending, setSubmittedPending] = React.useState(false);
  const [aiPrefill, setAiPrefill] = React.useState<Record<string, unknown> | null>(null);
  const [aiFormKey, setAiFormKey] = React.useState(0);

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

      {submittedPending ? <ListingSubmittedPendingAlert /> : null}

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
              sx={{
                textTransform: 'none',
                fontWeight: 800,
                borderRadius: 2.5,
                borderWidth: 1.5,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderWidth: 1.5,
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                },
              }}
            >
              Të gjitha kategoritë
            </Button>
          </Stack>
          <Stack spacing={2.25}>
            <PostListingAiAssist
              category="professionals"
              onApply={(initial) => {
                setAiPrefill(initial);
                setAiFormKey((k) => k + 1);
              }}
            />
            <ProfessionalListingForm
              key={`pro-${aiFormKey}`}
              aiPrefill={aiPrefill}
              onSuccess={() => setSubmittedPending(true)}
              backHref={paths.user.myRealEstateListings}
              backLabel="Shpalljet e mia"
            />
          </Stack>
        </CardContent>
      </Card>

      <ProfessionalVerificationCard />
    </Stack>
  );
}
