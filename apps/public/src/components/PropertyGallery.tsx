import Image from "next/image";

type PropertyGalleryProps = {
  images: {
    url: string;
    alt?: string | null;
  }[];
  title: string;
};

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  if (!images.length) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--muted)]">
        No photos available
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {images.map((image) => (
        <div
          key={image.url}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[var(--card)]"
        >
          <Image
            src={image.url}
            alt={image.alt ?? `${title} photo`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
