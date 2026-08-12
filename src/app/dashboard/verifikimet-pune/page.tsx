import { redirect } from 'next/navigation';

import { paths } from '@/paths';

export default function JobEmployerVerificationRedirect() {
  redirect(paths.dashboard.accountVerification);
}
