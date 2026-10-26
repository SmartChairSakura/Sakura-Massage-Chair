import { redirect } from 'next/navigation';

export default function ScopedChairListRedirectPage({
  params,
}: {
  params: { locationId: string };
}) {
  redirect(`/admin/chairs?location=${encodeURIComponent(params.locationId)}`);
}
