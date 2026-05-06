"use client";

import { useState } from "react";
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

  if (!images.length) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
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
    <div className="space-y-8 max-w-full overflow-hidden" onKeyDown={handleKeyDown}>
      {/* Main Carousel */}
      <div className="relative mx-auto w-full max-w-4xl">
        <div className="relative w-full rounded-2xl overflow-hidden bg-zinc-900 aspect-[3/4] sm:aspect-[4/3] sm:max-h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
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
                className="absolute left-2 sm:left-4 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg transition-all hover:bg-white hover:scale-110 active:scale-95"
                aria-label="Previous image"
              >
                <svg className="h-5 w-5 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 sm:right-4 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg transition-all hover:bg-white hover:scale-110 active:scale-95"
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
            <div className="absolute bottom-4 right-4 z-10 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-zinc-900 w-8"
                  : "bg-zinc-300 hover:bg-zinc-400"
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Photos</h3>
            {images.length > 6 && (
              <button
                onClick={() => setShowAllPhotos(true)}
                className="text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Show all photos
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
            {images.slice(0, 10).map((image, index) => (
              <button
                key={image.url}
                onClick={() => handleThumbnailClick(index)}
                className={`relative aspect-square overflow-hidden rounded-lg transition-all skeleton ${
                  index === currentIndex
                    ? "ring-2 ring-zinc-900 ring-offset-1"
                    : "opacity-70 hover:opacity-100 active:opacity-100"
                }`}
              >
                <Image
                  fill
                  src={transformImageUrl(image.url)}
                  alt={image.alt ?? `${title} thumbnail ${index + 1}`}
                  className="object-cover"
                  sizes="(max-width: 640px) 25vw, (max-width: 768px) 17vw, (max-width: 1024px) 12vw, 96px"
                  loading="lazy"
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
              className="relative h-[90vh] w-[95vw] max-w-4xl"
              onClick={(e) => e.stopPropagation()}
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
