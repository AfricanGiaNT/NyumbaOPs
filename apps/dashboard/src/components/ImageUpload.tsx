"use client";

import { useCallback, useState } from "react";

export type ImageFile = {
  file?: File;
  url?: string;
  preview?: string;
  alt?: string;
  isCover: boolean;
  sortOrder: number;
  uploading?: boolean;
};

type ImageUploadProps = {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_MAX_SIZE_MB = 20;

export function ImageUpload({
  images,
  onChange,
  maxImages = 6,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.name}. Only JPEG, PNG, and WebP are allowed.`;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File ${file.name} is too large (${sizeMB.toFixed(1)}MB). Maximum size is ${maxSizeMB}MB.`;
    }
    return null;
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setError(null);

      // Check if adding these files would exceed the limit
      const totalCount = images.length + files.length;
      if (totalCount > maxImages) {
        setError(`Cannot add ${files.length} images. Maximum ${maxImages} images allowed (currently have ${images.length}).`);
        return;
      }

      const newImages: ImageFile[] = [];
      const validationErrors: string[] = [];

      Array.from(files).forEach((file) => {
        const validationError = validateFile(file);
        if (validationError) {
          validationErrors.push(validationError);
          return;
        }

        // Create preview URL
        const preview = URL.createObjectURL(file);

        newImages.push({
          file,
          preview,
          alt: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          isCover: images.length === 0 && newImages.length === 0, // First image is cover
          sortOrder: images.length + newImages.length,
        });
      });

      if (validationErrors.length > 0) {
        setError(validationErrors.join(" "));
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
      }
    },
    [images, maxImages, maxSizeMB, onChange]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
    },
    [handleFiles]
  );

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    
    // If we removed the cover image, make the first image the new cover
    if (images[index].isCover && newImages.length > 0) {
      newImages[0].isCover = true;
    }

    // Update sort order
    newImages.forEach((img, i) => {
      img.sortOrder = i;
    });

    onChange(newImages);
  };

  const setCover = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isCover: i === index,
    }));
    onChange(newImages);
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    // Update sort order
    newImages.forEach((img, i) => {
      img.sortOrder = i;
    });

    onChange(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Image Previews - Show first if images exist */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-zinc-700">
              {images.length} of {maxImages} images
            </p>
            <p className="text-xs text-zinc-500">
              Drag to reorder • First image is cover
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img, index) => {
              const imageUrl = img.preview || img.url;
              if (!imageUrl) return null;
              
              return (
                <div
                  key={`${imageUrl}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-zinc-100 cursor-move transition-all ${
                    draggedIndex === index
                      ? "border-indigo-500 opacity-50 scale-95"
                      : img.isCover
                      ? "border-indigo-300"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  {/* Image Preview */}
                  <img
                    src={imageUrl}
                    alt={img.alt || `Image ${index + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />

                  {/* Drag Handle Indicator */}
                  <div className="absolute top-2 left-2 bg-black/50 rounded px-2 py-1 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    ⋮⋮
                  </div>

                  {/* Delete Button - Always visible on mobile, hover on desktop */}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 rounded-full bg-red-600 p-1.5 text-white shadow-lg transition-all hover:bg-red-700 sm:opacity-0 sm:group-hover:opacity-100"
                    title="Delete image"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                  {/* Cover Badge */}
                  {img.isCover && (
                    <div className="absolute bottom-2 left-2 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                      ⭐ Cover
                    </div>
                  )}

                  {/* Set as Cover Button - Show on hover for non-cover images */}
                  {!img.isCover && (
                    <button
                      type="button"
                      onClick={() => setCover(index)}
                      className="absolute bottom-2 left-2 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-900 shadow-lg transition-all hover:bg-zinc-100 opacity-0 group-hover:opacity-100"
                    >
                      Set as Cover
                    </button>
                  )}

                  {/* Upload Progress */}
                  {img.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
                      <div className="text-sm font-medium text-white">Uploading...</div>
                    </div>
                  )}

                  {/* Order Number */}
                  <div className="absolute bottom-2 right-2 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-semibold">
                    {index + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {canAddMore && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition ${
            dragActive
              ? "border-indigo-500 bg-indigo-50"
              : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
          }`}
        >
          <input
            id="image-upload"
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div className="pointer-events-none">
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm font-medium text-zinc-700">
              {images.length > 0 ? "Add more images" : "Drag & drop images here, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Max {maxImages} images • JPEG, PNG, WebP • Up to {maxSizeMB}MB each
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Info Text */}
      {!canAddMore && images.length > 0 && (
        <p className="text-center text-sm text-zinc-600">
          Maximum number of images reached ({maxImages})
        </p>
      )}
    </div>
  );
}
