import { redirect } from 'next/navigation';

import { paths } from '@/paths';

export default function ProfessionalVerificationRedirect() {
  redirect(paths.dashboard.accountVerification);
}
