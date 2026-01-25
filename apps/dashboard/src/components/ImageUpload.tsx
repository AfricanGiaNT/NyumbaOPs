"use client";

import { useCallback, useState } from "react";
import Image from "next/image";

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
const DEFAULT_MAX_SIZE_MB = 5;

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

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
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
              : "border-zinc-300 bg-zinc-50 hover:border-zinc-400"
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
              Drag & drop images here, or click to browse
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Max {maxImages} images • JPEG, PNG, WebP • Up to {maxSizeMB}MB each
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {images.length} of {maxImages} images uploaded
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

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img, index) => {
            const imageUrl = img.preview || img.url;
            if (!imageUrl) return null;
            
            return (
              <div
                key={`${imageUrl}-${index}`}
                className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
              >
                {/* Image Preview */}
                <div className="relative h-full w-full">
                  <Image
                    src={imageUrl}
                    alt={img.alt || `Image ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized={!!img.preview}
                  />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 transition group-hover:bg-opacity-40">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 transition group-hover:opacity-100">
                    {/* Set as Cover Button */}
                    {!img.isCover && (
                      <button
                        type="button"
                        onClick={() => setCover(index)}
                        className="rounded bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-sm hover:bg-zinc-100"
                      >
                        Set as Cover
                      </button>
                    )}

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Cover Badge */}
                {img.isCover && (
                  <div className="absolute left-2 top-2 rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow">
                    ⭐ Cover
                  </div>
                )}

                {/* Upload Progress */}
                {img.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-sm font-medium text-white">Uploading...</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Text */}
      {images.length === 0 && !canAddMore && (
        <p className="text-center text-sm text-zinc-500">
          No images uploaded yet
        </p>
      )}

      {!canAddMore && images.length > 0 && (
        <p className="text-center text-sm text-zinc-600">
          Maximum number of images reached ({maxImages})
        </p>
      )}
    </div>
  );
}
