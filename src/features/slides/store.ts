"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Presentation, Slide, Theme, GenerateSettings, Language, Tone } from "@/lib/slides/schema";

interface HistoryEntry {
  slides: Slide[];
  timestamp: number;
}

interface SlidesState {
  presentation: Presentation | null;
  settings: Omit<GenerateSettings, "text">;
  isGenerating: boolean;
  generationMode: "gateway" | "gateway_fallback" | "rule_based" | null;
  error: string | null;

  history: HistoryEntry[];
  historyIndex: number;

  recentPresentations: { id: string; title: string; updatedAt: number }[];

  setPresentation: (p: Presentation | null) => void;
  updateSlide: (index: number, slide: Slide) => void;
  deleteSlide: (index: number) => void;
  duplicateSlide: (index: number) => void;
  addSlide: (slide: Slide, afterIndex?: number) => void;
  moveSlide: (fromIndex: number, toIndex: number) => void;
  setTheme: (theme: Theme) => void;
  setSettings: (settings: Partial<Omit<GenerateSettings, "text">>) => void;
  setGenerating: (isGenerating: boolean) => void;
  setGenerationMode: (mode: "gateway" | "gateway_fallback" | "rule_based" | null) => void;
  setError: (error: string | null) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  saveToRecent: () => void;
  loadFromRecent: (id: string) => void;
  deleteFromRecent: (id: string) => void;
}

const MAX_HISTORY = 50;
const MAX_RECENT = 10;

function generatePresentationId(): string {
  return `pres_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const useSlidesStore = create<SlidesState>()(
  persist(
    (set, get) => ({
      presentation: null,
      settings: {
        slideCount: "auto" as const,
        language: "auto" as Language,
        tone: "business" as Tone,
        theme: "clean" as Theme,
      },
      isGenerating: false,
      generationMode: null,
      error: null,
      history: [],
      historyIndex: -1,
      recentPresentations: [],

      setPresentation: (p) => {
        set({ presentation: p, history: [], historyIndex: -1 });
        if (p) get().saveToRecent();
      },

      updateSlide: (index, slide) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;
        pushHistory();
        const newSlides = [...presentation.slides];
        newSlides[index] = slide;
        set({ presentation: { ...presentation, slides: newSlides } });
      },

      deleteSlide: (index) => {
        const { presentation, pushHistory } = get();
        if (!presentation || presentation.slides.length <= 1) return;
        pushHistory();
        const newSlides = presentation.slides.filter((_, i) => i !== index);
        set({ presentation: { ...presentation, slides: newSlides } });
      },

      duplicateSlide: (index) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;
        pushHistory();
        const slideToClone = presentation.slides[index];
        const newSlide = {
          ...slideToClone,
          id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        };
        const newSlides = [...presentation.slides];
        newSlides.splice(index + 1, 0, newSlide);
        set({ presentation: { ...presentation, slides: newSlides } });
      },

      addSlide: (slide, afterIndex) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;
        pushHistory();
        const newSlides = [...presentation.slides];
        const insertIndex = afterIndex !== undefined ? afterIndex + 1 : newSlides.length;
        newSlides.splice(insertIndex, 0, slide);
        set({ presentation: { ...presentation, slides: newSlides } });
      },

      moveSlide: (fromIndex, toIndex) => {
        const { presentation, pushHistory } = get();
        if (!presentation) return;
        if (fromIndex === toIndex) return;
        pushHistory();
        const newSlides = [...presentation.slides];
        const [removed] = newSlides.splice(fromIndex, 1);
        newSlides.splice(toIndex, 0, removed);
        set({ presentation: { ...presentation, slides: newSlides } });
      },

      setTheme: (theme) => {
        const { presentation } = get();
        if (!presentation) return;
        set({
          presentation: { ...presentation, theme },
          settings: { ...get().settings, theme },
        });
      },

      setSettings: (newSettings) => {
        set({ settings: { ...get().settings, ...newSettings } });
      },

      setGenerating: (isGenerating) => set({ isGenerating }),
      setGenerationMode: (mode) => set({ generationMode: mode }),
      setError: (error) => set({ error }),

      pushHistory: () => {
        const { presentation, history, historyIndex } = get();
        if (!presentation) return;
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({
          slides: JSON.parse(JSON.stringify(presentation.slides)),
          timestamp: Date.now(),
        });
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
        }
        set({ history: newHistory, historyIndex: newHistory.length - 1 });
      },

      undo: () => {
        const { presentation, history, historyIndex } = get();
        if (!presentation || historyIndex < 0) return;
        const entry = history[historyIndex];
        if (!entry) return;
        set({
          presentation: { ...presentation, slides: entry.slides },
          historyIndex: historyIndex - 1,
        });
      },

      redo: () => {
        const { presentation, history, historyIndex } = get();
        if (!presentation || historyIndex >= history.length - 1) return;
        const entry = history[historyIndex + 1];
        if (!entry) return;
        set({
          presentation: { ...presentation, slides: entry.slides },
          historyIndex: historyIndex + 1,
        });
      },

      canUndo: () => {
        const { historyIndex } = get();
        return historyIndex >= 0;
      },

      canRedo: () => {
        const { history, historyIndex } = get();
        return historyIndex < history.length - 1;
      },

      saveToRecent: () => {
        const { presentation, recentPresentations } = get();
        if (!presentation) return;

        const id = (presentation as Presentation & { id?: string }).id || generatePresentationId();
        const presentationWithId = { ...presentation, id };

        const existing = recentPresentations.findIndex((r) => r.id === id);
        let newRecent = [...recentPresentations];

        if (existing >= 0) {
          newRecent[existing] = {
            id,
            title: presentation.title,
            updatedAt: Date.now(),
          };
        } else {
          newRecent.unshift({
            id,
            title: presentation.title,
            updatedAt: Date.now(),
          });
        }

        newRecent = newRecent.slice(0, MAX_RECENT);

        localStorage.setItem(`slides_pres_${id}`, JSON.stringify(presentationWithId));

        set({
          presentation: presentationWithId,
          recentPresentations: newRecent,
        });
      },

      loadFromRecent: (id) => {
        const stored = localStorage.getItem(`slides_pres_${id}`);
        if (stored) {
          try {
            const presentation = JSON.parse(stored) as Presentation;
            set({ presentation, history: [], historyIndex: -1 });
          } catch {
            console.error("Failed to load presentation");
          }
        }
      },

      deleteFromRecent: (id) => {
        const { recentPresentations } = get();
        localStorage.removeItem(`slides_pres_${id}`);
        set({
          recentPresentations: recentPresentations.filter((r) => r.id !== id),
        });
      },
    }),
    {
      name: "slides-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        recentPresentations: state.recentPresentations,
      }),
    }
  )
);
