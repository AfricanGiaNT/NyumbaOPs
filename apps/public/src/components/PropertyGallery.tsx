"use client";

import { useState } from "react";
import { transformImageUrl } from "@/lib/image-utils";

type PropertyGalleryProps = {
  images: {
    url: string;
    alt?: string | null;
  }[];
  title: string;
};

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images.length) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        No photos available
      </div>
    );
  }

  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleNext = () => {
    setCurrentIndex((prev: number) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev: number) => (prev - 1 + images.length) % images.length);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart) return;
    setDragOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    if (!dragStart) return;
    
    const swipeThreshold = 80;
    if (Math.abs(dragOffset.x) > swipeThreshold) {
      if (dragOffset.x > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    
    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const visibleCards = 3;
  const getCardStyle = (index: number) => {
    const position = (index - currentIndex + images.length) % images.length;
    
    if (position >= visibleCards) return { display: 'none' };
    
    const isTopCard = position === 0;
    const baseTransform = `translateX(${position * 12}px) translateY(${position * 12}px) rotate(${position * 2}deg)`;
    const dragTransform = isTopCard && isDragging 
      ? `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${dragOffset.x * 0.05}deg)`
      : '';
    
    return {
      transform: dragTransform || baseTransform,
      zIndex: visibleCards - position,
      opacity: isTopCard && isDragging ? 0.9 : 1 - position * 0.15,
      transition: isDragging && isTopCard ? 'none' : 'all 0.3s ease-out',
    };
  };

  return (
    <div className="space-y-8 max-w-full overflow-hidden">
      {/* Stacked Cards */}
      <div className="relative mx-auto h-[400px] w-full max-w-[500px] md:h-[480px] md:max-w-[600px]" style={{ maxWidth: "100%" }}>
        <div className="relative h-full w-full" style={{ perspective: '1000px' }}>
          {images.map((image, index) => {
            const style = getCardStyle(index);
            if (style.display === 'none') return null;
            
            const isTopCard = (index - currentIndex + images.length) % images.length === 0;
            
            return (
              <div
                key={image.url}
                className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
                style={style}
                onPointerDown={isTopCard ? handlePointerDown : undefined}
                onPointerMove={isTopCard ? handlePointerMove : undefined}
                onPointerUp={isTopCard ? handlePointerUp : undefined}
                onPointerCancel={isTopCard ? handlePointerUp : undefined}
              >
                <div className="h-full w-full overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <img
                    src={transformImageUrl(image.url)}
                    alt={image.alt ?? `${title} photo ${index + 1}`}
                    className="h-full w-full object-cover select-none pointer-events-none"
                    draggable={false}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Image Counter Badge */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail Grid */}
      {images.length > 1 && (
        <div className="grid grid-cols-6 gap-2 md:grid-cols-8 lg:grid-cols-10">
          {images.map((image, index) => (
            <button
              key={image.url}
              onClick={() => setCurrentIndex(index)}
              className={`relative aspect-square overflow-hidden rounded-md transition-all ${
                currentIndex === index
                  ? "ring-2 ring-zinc-900 ring-offset-1"
                  : "opacity-70 hover:opacity-100 active:opacity-100"
              }`}
            >
              <img
                src={transformImageUrl(image.url)}
                alt={image.alt ?? `${title} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
