export interface NavItemConfig {
  key: string;
  title?: string;
  disabled?: boolean;
  external?: boolean;
  label?: string;
  icon?: string;
  href?: string;
  /** Nested nav entries (not React `children`). */
  subItems?: NavItemConfig[];
  /** If true, only platform admins (`accountType === 'admin'`) see this item. */
  platformAdminOnly?: boolean;
  // Matcher cannot be a function in order
  // to be able to use it on the server.
  // If you need to match multiple paths,
  // can extend it to accept multiple matchers.
  matcher?: { type: 'startsWith' | 'equals'; href: string };
}

/** Group of nav items under an optional section label. */
export interface NavSectionConfig {
  key: string;
  /** Section label shown above items. Omit / null for unlabeled top items. */
  title?: string | null;
  items: NavItemConfig[];
}
