'use client';

import * as React from 'react';

import { ProductTag } from '@/components/public/product-browse-chrome';
import { useOwnerEditHeaderActions } from '@/components/user/owner-edit-header-actions';
import { useCopy } from '@/hooks/use-copy';
import { useGrowOrEliteEntitlement } from '@/hooks/use-grow-or-elite-entitlement';
import { LEADS_BUTTON_ACCENT, LEADS_BUTTON_ICON } from '@/lib/notification-filter-tags';
import { isLeadNotificationType } from '@/lib/notification-tags';
import { listUserNotifications } from '@/lib/user-notifications-client';
import { paths } from '@/paths';

/**
 * Registers the Grow/Elite “Leads” control in the dashboard back-link row (top right).
 * Render once on a page — returns null; action is injected into the frame header.
 */
export function LeadsTopHeaderButton() {
  const t = useCopy();
  const entitled = useGrowOrEliteEntitlement();
  const [leadCount, setLeadCount] = React.useState(0);

  React.useEffect(() => {
    if (entitled !== true) {
      setLeadCount(0);
      return;
    }
    let cancelled = false;
    void listUserNotifications(false, 80).then((res) => {
      if (cancelled || res.error) return;
      setLeadCount((res.notifications ?? []).filter((n) => isLeadNotificationType(n.type)).length);
    });
    return () => {
      cancelled = true;
    };
  }, [entitled]);

  useOwnerEditHeaderActions(
    () =>
      entitled ? (
        <ProductTag
          href={paths.user.leads}
          icon={LEADS_BUTTON_ICON}
          accent={LEADS_BUTTON_ACCENT}
          label={leadCount > 0 ? `${t.notifications.tags.leads} (${leadCount})` : t.notifications.tags.leads}
        />
      ) : null,
    [entitled, leadCount, t.notifications.tags.leads],
  );

  return null;
}
