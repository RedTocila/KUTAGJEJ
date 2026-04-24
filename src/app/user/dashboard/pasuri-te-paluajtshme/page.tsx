'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Stack, Typography } from '@mui/material';

import { RealEstateListingForm } from '@/components/real-estate/real-estate-listing-form';
import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';

export default function UserRealEstateListingPage() {
  const router = useRouter();
  const { user } = useUser();

  const canPublish =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  React.useEffect(() => {
    if (!user) return;
    if (!canPublish) {
      router.replace(paths.user.dashboard);
    }
  }, [user, canPublish, router]);

  if (!user) return null;
  if (!canPublish) return null;

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Add real-estate listing
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
          Pasuri të paluajtshme — complete the form in English. Fields shown depend on the property category.
        </Typography>
      </Stack>

      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <RealEstateListingForm
            onSuccess={() => router.push(paths.user.myRealEstateListings)}
            backHref={paths.user.myRealEstateListings}
            backLabel="Shpalljet e mia"
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
