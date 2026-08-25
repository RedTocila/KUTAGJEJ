'use client';

import * as React from 'react';

import {
  cacheDraftExtraFiles,
  cacheDraftFiles,
  clearListingFormDraft,
  listingFormHasUserProgress,
  mergeCreateFormState,
  mergeImageUrls,
  readListingFormDraft,
  saveListingFormDraft,
  takeDraftExtraFiles,
  takeDraftFiles,
} from '@/lib/listing-form-draft';
import type { ListingCategoryKey } from '@/types/listing-category';

type ListingFormDraftOptions<T> = {
  category: ListingCategoryKey;
  enabled: boolean;
  skipRestore?: boolean;
  form: T;
  setForm: React.Dispatch<React.SetStateAction<T>>;
  existingImageUrls: string[];
  setExistingImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
  images: File[];
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
  extra?: Record<string, unknown>;
  onRestoreExtra?: (extra: Record<string, unknown>) => void;
  extraFiles?: Record<string, File[]>;
  onRestoreExtraFiles?: (files: Record<string, File[]>) => void;
  maxImages?: number;
};

export function useListingFormDraft<T extends object>(
  options: ListingFormDraftOptions<T>,
): { clearDraft: () => void } {
  const {
    category,
    enabled,
    skipRestore = false,
    form,
    setForm,
    existingImageUrls,
    setExistingImageUrls,
    images,
    setImages,
    extra,
    onRestoreExtra,
    extraFiles,
    onRestoreExtraFiles,
    maxImages = 8,
  } = options;

  const skipRestoreRef = React.useRef(skipRestore);
  const restoredRef = React.useRef(false);
  const extraRef = React.useRef(extra);
  extraRef.current = extra;
  const extraFilesRef = React.useRef(extraFiles);
  extraFilesRef.current = extraFiles;
  const onRestoreExtraRef = React.useRef(onRestoreExtra);
  onRestoreExtraRef.current = onRestoreExtra;
  const onRestoreExtraFilesRef = React.useRef(onRestoreExtraFiles);
  onRestoreExtraFilesRef.current = onRestoreExtraFiles;

  const clearDraft = React.useCallback(() => {
    clearListingFormDraft(category);
  }, [category]);

  React.useLayoutEffect(() => {
    if (!enabled || restoredRef.current) return;
    restoredRef.current = true;
    if (skipRestoreRef.current) return;

    const draft = readListingFormDraft(category);
    if (!draft || !listingFormHasUserProgress(draft.form, { existingImageUrls: draft.existingImageUrls })) {
      return;
    }

    setForm((prev) => mergeCreateFormState(prev as Record<string, unknown>, draft.form) as T);
    setExistingImageUrls((prev) => mergeImageUrls(prev, draft.existingImageUrls, maxImages));
    const files = takeDraftFiles(category);
    if (files.length) setImages(files);
    if (draft.extra && onRestoreExtraRef.current) onRestoreExtraRef.current(draft.extra);
    const cachedExtra = takeDraftExtraFiles(category);
    if (Object.keys(cachedExtra).length && onRestoreExtraFilesRef.current) {
      onRestoreExtraFilesRef.current(cachedExtra);
    }
  }, [category, enabled, maxImages, setForm, setExistingImageUrls, setImages]);

  React.useEffect(() => {
    if (!enabled) return;

    const handle = window.setTimeout(() => {
      if (
        !listingFormHasUserProgress(form as Record<string, unknown>, {
          existingImageUrls,
          images,
        })
      ) {
        return;
      }
      saveListingFormDraft({
        v: 1,
        category,
        form: form as Record<string, unknown>,
        existingImageUrls,
        extra: extraRef.current,
        savedAt: Date.now(),
      });
      cacheDraftFiles(category, images);
      if (extraFilesRef.current) cacheDraftExtraFiles(category, extraFilesRef.current);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [category, enabled, form, existingImageUrls, images]);

  return { clearDraft };
}
