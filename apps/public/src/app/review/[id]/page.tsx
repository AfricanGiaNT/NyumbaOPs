import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPublicProperty } from "@/lib/api";
import { ReviewFormClient } from "./ReviewFormClient";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetchPublicProperty(id);
    return { title: `Leave a review — ${res.data.name}` };
  } catch {
    return { title: "Leave a review" };
  }
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;

  let property: Awaited<ReturnType<typeof fetchPublicProperty>>["data"];
  try {
    const res = await fetchPublicProperty(id);
    property = res.data;
  } catch {
    notFound();
  }

  const coverImage = property.images.find((img) => img.isCover) ?? property.images[0] ?? null;

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {/* Property header */}
        <div className="mb-8 flex items-center gap-4">
          {coverImage && (
            <img
              src={coverImage.url}
              alt={coverImage.alt ?? property.name}
              className="h-16 w-16 rounded-xl object-cover shadow-sm flex-shrink-0"
            />
          )}
          <div>
            <p className="text-sm font-medium text-zinc-500">Reviewing</p>
            <h1 className="text-xl font-bold text-zinc-900">{property.name}</h1>
            {property.location && (
              <p className="text-sm text-zinc-500">{property.location}</p>
            )}
          </div>
        </div>

        <ReviewFormClient propertyId={id} />
      </div>
    </main>
  );
}
