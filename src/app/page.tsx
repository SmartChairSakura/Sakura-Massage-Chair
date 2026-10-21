import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Root Landing Page for Sakura Zen IoT Cloud Platform.
 * Automatically routes users to the Admin Backoffice Dashboard & Authentication Guard.
 */
export default function RootPage() {
  redirect('/admin/dashboard');
}
