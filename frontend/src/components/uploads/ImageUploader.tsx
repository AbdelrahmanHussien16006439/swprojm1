"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { Button, FormErrors } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface UploadedImage {
  id: string;
  url: string;
}

interface ImageUploaderProps {
  value?: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  onUpload: (file: File) => Promise<UploadedImage>;
  onRemove?: (image: UploadedImage) => Promise<void>;
  maxCount?: number;
  disabled?: boolean;
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png"]);

/**
 * Example for a post: onUpload={(file) => { const formData = new FormData();
 * formData.append("file", file); return api.upload(`/posts/${postId}/images`, formData); }}.
 * The caller owns the endpoint because each item type has a different upload route.
 */
export function ImageUploader({ value = [], onChange, onUpload, onRemove, maxCount = 5, disabled = false, className }: ImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (value.length + selected.length > maxCount) {
      setError(new Error(`You can attach at most ${maxCount} images.`));
      return;
    }
    const invalidType = selected.find((file) => !ACCEPTED_TYPES.has(file.type));
    if (invalidType) {
      setError(new Error(`${invalidType.name} is not a JPG or PNG image.`));
      return;
    }
    const oversized = selected.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setError(new Error(`${oversized.name} is larger than 5 MB.`));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of selected) {
        uploaded.push(await onUpload(file));
      }
      onChange([...value, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeImage = async (image: UploadedImage) => {
    setBusy(true);
    setError(null);
    try {
      if (onRemove) await onRemove(image);
      onChange(value.filter((item) => item.id !== image.id));
    } catch (removeError) {
      setError(removeError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="sr-only"
        disabled={disabled || busy || value.length >= maxCount}
        onChange={(event) => void uploadFiles(event.target.files)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy || value.length >= maxCount}
          loading={busy}
        >
          {busy ? "Uploading…" : "Add images"}
        </Button>
        <span className="text-sm text-muted">JPG or PNG, up to 5 MB each · {value.length}/{maxCount}</span>
      </div>
      <FormErrors error={error} />
      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Uploaded images">
          {value.map((image) => (
            <li key={image.id} className="relative overflow-hidden rounded-2xl border border-border bg-surface">
              <Image src={image.url} alt="Uploaded preview" width={400} height={400} unoptimized className="aspect-square w-full object-cover" />
              <button
                type="button"
                className="absolute right-2 top-2 rounded-full bg-surface/95 px-3 py-1 text-xs font-semibold text-danger shadow-sm transition hover:bg-danger-soft"
                onClick={() => void removeImage(image)}
                disabled={disabled || busy}
                aria-label="Remove uploaded image"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
