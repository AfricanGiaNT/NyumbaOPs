"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { transformImageUrl, BLUR_DATA_URL } from "@/lib/image-utils";

type PropertyGalleryProps = {
  images: {
    url: string;
    alt?: string | null;
  }[];
  title: string;
};

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Touch-swipe tracking for mobile navigation.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_THRESHOLD = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent, next: () => void, prev: () => void) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    // Only act on a mostly-horizontal swipe so vertical page scrolling is unaffected.
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
  };

  if (!images.length) {
    return (
      <div className="flex aspect-[16/9] max-h-[380px] w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        No photos available
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === "ArrowRight") handleNext();
  };

  return (
    <div className="min-w-0 space-y-3" onKeyDown={handleKeyDown}>
      {/* Main Carousel */}
      <div className="relative w-full">
        <div
          className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-900 sm:aspect-[16/9] lg:aspect-[2.2/1] lg:max-h-[380px] touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, handleNext, handlePrev)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center cursor-zoom-in"
              onClick={() => setLightboxIndex(currentIndex)}
            >
              <Image
                fill
                src={transformImageUrl(images[currentIndex].url)}
                alt={images[currentIndex].alt ?? `${title} photo ${currentIndex + 1}`}
                priority={currentIndex === 0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 896px"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {/* Arrow buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white sm:left-4"
                aria-label="Previous image"
              >
                <svg className="h-5 w-5 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white sm:right-4"
                aria-label="Next image"
              >
                <svg className="h-5 w-5 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 z-10 rounded-md bg-black/65 px-2.5 py-1 text-xs font-medium text-white sm:bottom-4 sm:right-4">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-500">{images.length} photos</p>
            {images.length > 6 && (
              <button
                onClick={() => setShowAllPhotos(true)}
                className="text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                Show all photos
              </button>
            )}
          </div>
          <div className="property-gallery-thumbnails flex gap-2 overflow-x-auto pb-1">
            {images.slice(0, 8).map((image, index) => (
              <button
                key={image.url}
                onClick={() => handleThumbnailClick(index)}
                aria-label={`View photo ${index + 1}`}
                aria-current={index === currentIndex ? "true" : undefined}
                className={`relative h-14 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-100 transition-opacity sm:h-16 sm:w-20 ${
                  index === currentIndex
                    ? "ring-2 ring-[var(--accent)] ring-inset"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  fill
                  src={transformImageUrl(image.url)}
                  alt={image.alt ?? `${title} thumbnail ${index + 1}`}
                  className="object-cover"
                  sizes="80px"
                  loading="lazy"
                  quality={70}
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Single-image lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute right-3 top-3 sm:right-4 sm:top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-all hover:bg-white active:scale-95"
              aria-label="Close"
            >
              <svg className="h-5 w-5 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image */}
            <div
              className="relative h-[90vh] w-[95vw] max-w-4xl touch-pan-y"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) =>
                handleTouchEnd(
                  e,
                  () => setLightboxIndex((lightboxIndex + 1) % images.length),
                  () => setLightboxIndex((lightboxIndex - 1 + images.length) % images.length),
                )
              }
            >
              <Image
                fill
                src={transformImageUrl(images[lightboxIndex].url)}
                alt={images[lightboxIndex].alt ?? `${title} photo ${lightboxIndex + 1}`}
                className="object-contain"
                sizes="95vw"
                priority
              />
            </div>

            {/* Prev / Next */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + images.length) % images.length); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-all hover:bg-white active:scale-95"
                  aria-label="Previous image"
                >
                  <svg className="h-5 w-5 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % images.length); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-all hover:bg-white active:scale-95"
                  aria-label="Next image"
                >
                  <svg className="h-5 w-5 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
              {lightboxIndex + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen photo grid modal */}
      <AnimatePresence>
        {showAllPhotos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
            onClick={() => setShowAllPhotos(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative mx-auto h-[95vh] w-[95vw] sm:h-[90vh] sm:w-[90vw] max-w-6xl overflow-hidden rounded-2xl bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowAllPhotos(false)}
                className="absolute right-3 top-3 sm:right-4 sm:top-4 z-10 flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-all hover:bg-white hover:scale-110 active:scale-95"
                aria-label="Close photos"
              >
                <svg className="h-5 w-5 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Photo grid */}
              <div className="h-full overflow-y-auto p-4 sm:p-8">
                <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {images.map((image, index) => (
                    <motion.div
                      key={image.url}
                      layoutId={`photo-${index}`}
                      className="relative aspect-square overflow-hidden rounded-lg cursor-pointer bg-zinc-800"
                      onClick={() => {
                        setCurrentIndex(index);
                        setShowAllPhotos(false);
                      }}
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Image
                        fill
                        src={transformImageUrl(image.url)}
                        alt={image.alt ?? `${title} photo ${index + 1}`}
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        loading="lazy"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
