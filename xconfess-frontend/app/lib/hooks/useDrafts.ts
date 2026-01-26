"use client";

import { useState, useEffect, useCallback } from "react";
import { Gender } from "@/app/lib/utils/validation";

export interface Draft {
  id: string;
  title?: string;
  body: string;
  gender?: Gender;
  savedAt: number;
  characterCount: number;
}

const STORAGE_KEY = "xconfess-drafts";
const MAX_DRAFTS = 10;

export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored) as Draft[];
        }
      } catch (error) {
        console.error("Failed to load drafts:", error);
      }
    }
    return [];
  });

  const saveDrafts = useCallback((newDrafts: Draft[]) => {
    try {
      const sorted = [...newDrafts]
        .sort((a, b) => b.savedAt - a.savedAt)
        .slice(0, MAX_DRAFTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
      setDrafts(sorted);
    } catch (error) {
      console.error("Failed to save drafts:", error);
    }
  }, []);

  const saveDraft = useCallback(
    (draft: Omit<Draft, "id" | "savedAt" | "characterCount">): string => {
      const newDraft: Draft = {
        ...draft,
        id: crypto.randomUUID(),
        savedAt: Date.now(),
        characterCount: (draft.title?.length || 0) + draft.body.length,
      };

      setDrafts((prev) => {
        const updated = [newDraft, ...prev.filter((d) => d.id !== newDraft.id)];
        saveDrafts(updated);
        return updated;
      });

      return newDraft.id;
    },
    [saveDrafts],
  );

  const updateDraft = useCallback(
    (id: string, updates: Partial<Omit<Draft, "id" | "savedAt">>) => {
      setDrafts((prev) => {
        const updated = prev.map((draft) =>
          draft.id === id
            ? {
                ...draft,
                ...updates,
                savedAt: Date.now(),
                characterCount:
                  (updates.title?.length || draft.title?.length || 0) +
                  (updates.body?.length || draft.body.length),
              }
            : draft,
        );
        saveDrafts(updated);
        return updated;
      });
    },
    [saveDrafts],
  );

  const deleteDraft = useCallback(
    (id: string) => {
      setDrafts((prev) => {
        const updated = prev.filter((d) => d.id !== id);
        saveDrafts(updated);
        return updated;
      });
    },
    [saveDrafts],
  );

  const clearDrafts = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDrafts([]);
  }, []);

  const loadDraft = useCallback(
    (id: string): Draft | undefined => {
      return drafts.find((d) => d.id === id);
    },
    [drafts],
  );

  return {
    drafts,
    saveDraft,
    updateDraft,
    deleteDraft,
    clearDrafts,
    loadDraft,
  };
}
