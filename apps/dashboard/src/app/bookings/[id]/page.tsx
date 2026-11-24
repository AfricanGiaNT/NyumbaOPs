import { redirect } from "next/navigation";

export default async function OldBookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/stays/${encodeURIComponent(id)}`);
}
