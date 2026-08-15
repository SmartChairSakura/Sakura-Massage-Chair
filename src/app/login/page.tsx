import { redirect } from 'next/navigation';

export default function RootLoginRedirect() {
  redirect('/admin/login');
}
