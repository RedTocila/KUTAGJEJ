'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button } from '@mui/material';
import { Flag as FlagIcon } from '@phosphor-icons/react/dist/ssr/Flag';

import { paths } from '@/paths';
import { hasStoredAccessToken } from '@/lib/auth/storage';
import type { ConversationListingKind } from '@/lib/conversations-client';
import { LISTING_REPORT_REASONS } from '@/lib/moderation-client';
import { useUser } from '@/hooks/use-user';
import { ReportContentDialog } from '@/components/core/report-content-dialog';

/** “Raporto njoftimin” — shown under every listing detail page (App Store UGC requirement). */
export function ListingReportButton({
  listingKind,
  listingId,
}: {
  listingKind: ConversationListingKind;
  listingId: string;
}): React.JSX.Element {
  const router = useRouter();
  const { user } = useUser();
  const [open, setOpen] = React.useState(false);

  const handleClick = () => {
    if (!user && !hasStoredAccessToken()) {
      router.push(paths.user.auth);
      return;
    }
    setOpen(true);
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
      <Button
        type="button"
        size="small"
        color="inherit"
        onClick={handleClick}
        startIcon={<FlagIcon size={16} weight="bold" />}
        sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
      >
        Raporto njoftimin
      </Button>
      <ReportContentDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Raporto njoftimin"
        subtitle="Pse po e raportoni këtë njoftim?"
        payload={{ targetType: 'listing', listingKind, listingId }}
        reasons={LISTING_REPORT_REASONS}
      />
    </Box>
  );
}
