import { isPersistableImageUrl } from '@/lib/image-url';
import { uploadListingImages } from '@/lib/uploads-client';

/**
 * Keep only durable URLs and upload any newly picked files.
 * Used by owner-edit photo dialogs so Apply/Save never persist blob: previews.
 */
export async function commitListingPhotos(args: {
  existingUrls: string[];
  newFiles: File[];
  folder: string;
  max: number;
}): Promise<{ urls: string[]; error?: string }> {
  const kept = (args.existingUrls ?? []).filter(isPersistableImageUrl);
  const slots = Math.max(0, args.max - kept.length);
  let uploaded: string[] = [];
  if (args.newFiles.length > 0 && slots > 0) {
    const up = await uploadListingImages(args.newFiles.slice(0, slots), args.folder);
    if (up.error) return { urls: kept, error: up.error };
    uploaded = up.urls;
  }
  return { urls: [...kept, ...uploaded].slice(0, args.max) };
}
