"use client";

import { useEffect, useMemo, useState } from "react";
import { PropertyImage } from "@/lib/types";
import { createZip } from "@/lib/zip";
import { ActionButton } from "./ActionButton";

type Props = {
  propertyName: string;
  images: PropertyImage[];
};

type Prepared = { file: File; previewUrl: string };

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
  "image/avif": "avif",
};

// Some mobile browsers cap how many files one share can carry, so when the
// whole set is rejected we fall back to batches of this size.
const SHARE_BATCH = 10;

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "property"
  );
}

function extensionFor(type: string, url: string) {
  if (EXT_BY_TYPE[type]) return EXT_BY_TYPE[type];
  const match = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i);
  return match ? match[1].toLowerCase() : "jpg";
}

function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

function canShareFiles(files: File[]) {
  try {
    return typeof navigator !== "undefined" && !!navigator.canShare?.({ files });
  } catch {
    return false;
  }
}

/**
 * Downloads every photo of a property at original quality (the exact bytes
 * stored in Supabase — no resizing or re-encoding).
 *
 * Two steps, on purpose: the first tap fetches the photos, the second tap
 * opens the share sheet. iOS Safari only allows navigator.share() directly
 * inside a tap, so it can't be called after a long download.
 *
 * - "Save to Photos" (phones): share sheet → "Save Images" → camera roll.
 * - "Download ZIP": one file with everything (best on a computer).
 * - Per-photo save links as a fallback for browsers without file sharing.
 */
export function DownloadPhotosButton({ propertyName, images }: Props) {
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<Prepared[] | null>(null);

  const sorted = useMemo(
    () =>
      [...images].sort((a, b) => {
        if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      }),
    [images],
  );
  const slug = slugify(propertyName);

  // Release object URLs when the sheet closes / component unmounts.
  useEffect(() => {
    if (!prepared) return;
    return () => prepared.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  }, [prepared]);

  // Lock background scroll while the sheet is open (matters on phones).
  useEffect(() => {
    if (!prepared) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [prepared]);

  const files = prepared?.map((p) => p.file) ?? [];
  const shareAll = prepared ? canShareFiles(files) : false;
  const batches: File[][] = [];
  if (prepared && !shareAll) {
    for (let i = 0; i < files.length; i += SHARE_BATCH) {
      batches.push(files.slice(i, i + SHARE_BATCH));
    }
  }
  const shareBatches = batches.length > 0 && canShareFiles(batches[0]);

  const handlePrepare = async () => {
    setError(null);
    try {
      const result: Prepared[] = [];
      for (const [index, img] of sorted.entries()) {
        setProgress(`Loading ${index + 1}/${sorted.length}…`);
        const res = await fetch(img.url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Photo ${index + 1} failed to load (${res.status})`);
        const blob = await res.blob();
        const ext = extensionFor(blob.type, img.url);
        const name = `${slug}-${String(index + 1).padStart(2, "0")}.${ext}`;
        const file = new File([blob], name, { type: blob.type || "image/jpeg" });
        result.push({ file, previewUrl: URL.createObjectURL(file) });
      }
      setPrepared(result);
    } catch (err) {
      setError((err as Error).message || "Could not load photos");
    } finally {
      setProgress(null);
    }
  };

  // Must stay synchronous up to navigator.share() to keep the tap's user
  // activation (required by iOS Safari).
  const handleShare = (toShare: File[]) => {
    setError(null);
    navigator.share({ files: toShare }).catch((err: Error) => {
      if (err.name !== "AbortError") setError(`Sharing failed: ${err.message}`);
    });
  };

  const handleZip = async () => {
    if (!prepared) return;
    setError(null);
    setProgress("Building ZIP…");
    try {
      const entries = await Promise.all(
        prepared.map(async ({ file }) => ({
          name: file.name,
          data: new Uint8Array(await file.arrayBuffer()),
        })),
      );
      saveBlob(createZip(entries), `${slug}-photos.zip`);
    } catch (err) {
      setError((err as Error).message || "Could not build ZIP");
    } finally {
      setProgress(null);
    }
  };

  if (sorted.length === 0) return null;

  return (
    <>
      <div className="flex flex-col items-stretch gap-1 sm:items-end">
        <ActionButton
          variant="secondary"
          onClick={handlePrepare}
          loading={progress !== null && !prepared}
          className="w-full sm:w-auto dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {(!prepared && progress) || `Download Photos (${sorted.length})`}
        </ActionButton>
        {error && !prepared && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {prepared && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setPrepared(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Download photos"
        >
          <div
            className="flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl dark:bg-zinc-900 sm:max-w-lg sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {prepared.length} photos ready
                </h2>
                <p className="text-xs text-zinc-500">Original quality, cover photo first</p>
              </div>
              <button
                type="button"
                onClick={() => setPrepared(null)}
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-2xl leading-none text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-2 px-4 pt-4">
              {shareAll && (
                <ActionButton size="lg" className="w-full" onClick={() => handleShare(files)}>
                  Save to Photos
                </ActionButton>
              )}
              {shareBatches &&
                batches.map((batch, i) => (
                  <ActionButton
                    key={i}
                    size="lg"
                    className="w-full"
                    onClick={() => handleShare(batch)}
                  >
                    Save photos {i * SHARE_BATCH + 1}–{i * SHARE_BATCH + batch.length}
                  </ActionButton>
                ))}
              {(shareAll || shareBatches) && (
                <p className="text-center text-xs text-zinc-500">
                  Then tap <span className="font-medium">Save Images</span> to add them to your camera roll.
                </p>
              )}
              <ActionButton
                variant="secondary"
                size="lg"
                className="w-full dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={handleZip}
                loading={progress !== null}
              >
                {progress ?? "Download ZIP"}
              </ActionButton>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            <div className="mt-4 overflow-y-auto overscroll-contain border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <p className="mb-2 text-xs text-zinc-500">Or save one at a time:</p>
              <ul className="grid grid-cols-3 gap-2">
                {prepared.map(({ file, previewUrl }) => (
                  <li key={file.name}>
                    <a
                      href={previewUrl}
                      download={file.name}
                      className="block overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                      <img src={previewUrl} alt={file.name} className="aspect-square w-full object-cover" />
                      <span className="block truncate px-1 py-1 text-center text-[11px] text-zinc-600 dark:text-zinc-400">
                        {file.name.replace(`${slug}-`, "")}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
