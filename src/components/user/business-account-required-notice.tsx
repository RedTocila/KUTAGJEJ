'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';

import { paths } from '@/paths';

/** Shown when an individual tries a business-only action. */
export function BusinessAccountRequiredNotice({
  dense = false,
}: {
  dense?: boolean;
}) {
  return (
    <Alert
      severity="warning"
      icon={<BuildingsIcon size={22} weight="duotone" />}
      sx={{ borderRadius: 2.5, alignItems: 'flex-start' }}
    >
      <Stack spacing={dense ? 1 : 1.25} sx={{ alignItems: 'flex-start' }}>
        <Typography sx={{ fontWeight: 700, lineHeight: 1.4 }}>
          Krijoni një llogari biznesi për të kryer këtë veprim.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
          Plotësoni profilin e biznesit nga faqja e profilit për të kthyer llogarinë individuale në llogari biznesi.
        </Typography>
        <Button
          component={RouterLink}
          href={`${paths.user.profile}?upgrade=business`}
          variant="contained"
          size="small"
          sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
        >
          Kompleto profilin e biznesit
        </Button>
      </Stack>
    </Alert>
  );
}
