import { redirect } from 'next/navigation';

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; checkIn?: string; checkOut?: string }>;
}) {
  const { propertyId, checkIn, checkOut } = await searchParams;
  if (!propertyId) redirect('/properties');
  const query = new URLSearchParams();
  if (checkIn) query.set('checkIn', checkIn);
  if (checkOut) query.set('checkOut', checkOut);
  redirect(`/properties/${encodeURIComponent(propertyId)}?${query.toString()}#inquiry`);
}
