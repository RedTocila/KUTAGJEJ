import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';
import { NotFoundView } from './not-found-view';

export const metadata = { title: `Not found | ${config.site.name}` } satisfies Metadata;

export default function NotFound(): ReactNode {
  return <NotFoundView />;
}
