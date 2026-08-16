"use client";

import imageCompression from "browser-image-compression";
import { Camera, GripVertical, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import {
  BUCKETS,
  extensionFor,
  productImagePath,
  publicUrl,
} from "@/lib/storage";

export type UploadedImage = { path: string; width: number; height: number };

/**
 * Vendors shoot on a phone, so a single photo out of the camera is routinely
 * 4MB. Compressing in the browser keeps the upload survivable on a weak
 * connection and keeps the public drop page inside its data budget.
 */
const COMPRESSION = {
  maxSizeMB: 0.35,
  maxWidthOrHeight: 1400,
  useWebWorker: true,
  fileType: "image/webp",
} as const;

export function ImageUploader({
  vendorId,
  productId,
  value,
  onChange,
  max = 6,
}: {
  vendorId: string;
  productId: string;
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const files = Array.from(fileList).slice(0, max - value.length);
    if (files.length === 0) {
      toast.error(`You can add up to ${max} photos.`);
      return;
    }

    setUploading((count) => count + files.length);
    const supabase = createClient();
    const uploaded: UploadedImage[] = [];

    for (const file of files) {
      try {
        const compressed = await imageCompression(file, COMPRESSION);
        const dimensions = await readDimensions(compressed);
        const path = productImagePath(
          vendorId,
          productId,
          extensionFor(compressed.type),
        );

        const { error } = await supabase.storage
          .from(BUCKETS.productImages)
          .upload(path, compressed, {
            contentType: compressed.type,
            upsert: false,
          });

        if (error) throw error;
        uploaded.push({ path, ...dimensions });
      } catch (error) {
        const raw =
          error instanceof Error ? error.message : "Upload failed";
        const lower = raw.toLowerCase();
        const friendly =
          lower.includes("name resolution") ||
          lower.includes("fetch failed") ||
          lower.includes("failed to fetch") ||
          lower.includes("network")
            ? "Storage is unreachable right now. Check that local Supabase is running, then try again."
            : raw;
        toast.error(`Could not upload ${file.name}: ${friendly}`);
      } finally {
        setUploading((count) => count - 1);
      }
    }

    if (uploaded.length > 0) onChange([...value, ...uploaded]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(path: string) {
    onChange(value.filter((image) => image.path !== path));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((image, index) => (
          <div
            key={image.path}
            className="group relative aspect-4/5 overflow-hidden rounded-card border border-ink/15 bg-surface-muted"
          >
            <Image
              src={publicUrl(BUCKETS.productImages, image.path)}
              alt=""
              fill
              sizes="(min-width: 640px) 25vw, 33vw"
              className="object-cover"
            />

            {index === 0 && (
              <span className="absolute top-1 left-1 rounded-full bg-ink/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Cover
              </span>
            )}

            <button
              type="button"
              onClick={() => remove(image.path)}
              aria-label="Remove photo"
              className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-ink/70 text-white"
            >
              <X className="size-3.5" aria-hidden />
            </button>

            {value.length > 1 && (
              <div className="absolute inset-x-1 bottom-1 flex justify-between">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label="Move photo earlier"
                  className="flex size-7 items-center justify-center rounded-full bg-ink/70 text-white disabled:opacity-30"
                >
                  <GripVertical className="size-3.5 rotate-90" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === value.length - 1}
                  aria-label="Move photo later"
                  className="flex size-7 items-center justify-center rounded-full bg-ink/70 text-white disabled:opacity-30"
                >
                  <GripVertical className="size-3.5 -rotate-90" aria-hidden />
                </button>
              </div>
            )}
          </div>
        ))}

        {Array.from({ length: uploading }).map((_, index) => (
          <div
            key={`uploading-${index}`}
            className="flex aspect-4/5 items-center justify-center rounded-card border border-border bg-surface-muted"
          >
            <Loader2 className="size-5 animate-spin text-ink-subtle" aria-hidden />
          </div>
        ))}

        {value.length + uploading < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex aspect-4/5 flex-col items-center justify-center gap-1.5 rounded-card border border-dashed border-border",
              "text-ink-muted transition-colors hover:border-brand-400 hover:text-brand-700",
            )}
          >
            <Camera className="size-5" aria-hidden />
            <span className="text-xs font-medium">Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        // `capture` opens the camera directly on Android, which is how most of
        // these photos are actually taken.
        capture="environment"
        multiple
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <p className="text-xs text-ink-muted">
        First photo is the cover. Photos are shrunk on your phone before
        uploading, so this works on slow data.
      </p>
    </div>
  );
}

function readDimensions(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    // `window.Image` because the bare name is the next/image component here.
    const image = new window.Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}
