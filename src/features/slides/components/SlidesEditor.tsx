"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Plus,
  Undo2,
  Redo2,
  Play,
  Download,
  RefreshCw,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { useSlidesStore } from "../store";
import { SlideRenderer, SLIDE_WIDTH, SLIDE_HEIGHT } from "./SlideRenderer";
import type { Slide, Theme } from "@/lib/slides/schema";
import { themes } from "@/lib/slides/themes";
import { cn } from "@/lib/utils";

function getSlideTitle(slide: Slide | undefined): string | undefined {
  if (!slide) return undefined;
  if ("title" in slide && typeof slide.title === "string") return slide.title;
  if (slide.type === "quote") return slide.quote?.slice(0, 50);
  return undefined;
}

const SLIDE_TYPES: { type: Slide["type"]; label: string }[] = [
  { type: "title", label: "Заголовок" },
  { type: "bullets", label: "Список" },
  { type: "quote", label: "Цитата" },
  { type: "stats", label: "Статистика" },
  { type: "two_columns", label: "Две колонки" },
  { type: "summary", label: "Итоги" },
];

function createEmptySlide(type: Slide["type"]): Slide {
  const id = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  switch (type) {
    case "title":
      return { id, type: "title", title: "Новый заголовок", subtitle: "" };
    case "bullets":
      return { id, type: "bullets", title: "Новый слайд", bullets: ["Пункт 1", "Пункт 2", "Пункт 3"] };
    case "quote":
      return { id, type: "quote", quote: "Введите цитату", author: "" };
    case "stats":
      return { id, type: "stats", title: "Статистика", stats: [{ value: "0", label: "Метрика" }] };
    case "two_columns":
      return {
        id,
        type: "two_columns",
        title: "Сравнение",
        left: { heading: "Левая колонка", bullets: ["Пункт 1"] },
        right: { heading: "Правая колонка", bullets: ["Пункт 1"] },
      };
    case "summary":
      return { id, type: "summary", title: "Итоги", bullets: ["Итог 1"], cta: "Вопросы?" };
  }
}

interface SlidesPanelProps {
  activeIndex: number;
  onSelect: (index: number) => void;
}

function SlidesPanel({ activeIndex, onSelect }: SlidesPanelProps) {
  const { presentation, moveSlide, deleteSlide, duplicateSlide, addSlide } = useSlidesStore();
  const [showAddMenu, setShowAddMenu] = useState(false);

  if (!presentation) return null;

  const handleMoveUp = (index: number) => {
    if (index > 0) moveSlide(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index < presentation.slides.length - 1) moveSlide(index, index + 1);
  };

  const handleAddSlide = (type: Slide["type"]) => {
    addSlide(createEmptySlide(type), activeIndex);
    setShowAddMenu(false);
  };

  const thumbnailScale = 0.15;

  return (
    <div className="w-64 bg-slate-100 border-r border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Слайды</span>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
            title="Добавить слайд"
          >
            <Plus size={18} />
          </button>
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
              {SLIDE_TYPES.map((st) => (
                <button
                  key={st.type}
                  onClick={() => handleAddSlide(st.type)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {presentation.slides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "group relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
              activeIndex === index
                ? "border-blue-500 shadow-md"
                : "border-transparent hover:border-slate-300"
            )}
            onClick={() => onSelect(index)}
          >
            <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded z-10">
              {index + 1}
            </div>

            <div
              className="overflow-hidden bg-white"
              style={{
                width: SLIDE_WIDTH * thumbnailScale,
                height: SLIDE_HEIGHT * thumbnailScale,
              }}
            >
              <SlideRenderer
                slide={slide}
                theme={presentation.theme}
                scale={thumbnailScale}
              />
            </div>

            <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
              <button
                onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                className="p-1 bg-black/50 text-white rounded hover:bg-black/70"
                disabled={index === 0}
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                className="p-1 bg-black/50 text-white rounded hover:bg-black/70"
                disabled={index === presentation.slides.length - 1}
              >
                <ChevronDown size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); duplicateSlide(index); }}
                className="p-1 bg-black/50 text-white rounded hover:bg-black/70"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSlide(index); }}
                className="p-1 bg-red-500/80 text-white rounded hover:bg-red-600"
                disabled={presentation.slides.length <= 1}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PropertiesPanelProps {
  activeIndex: number;
  onRegenerate: (hint?: string) => void;
  onAddImage: () => void;
  isRegenerating: boolean;
  isAddingImage: boolean;
}

function PropertiesPanel({
  activeIndex,
  onRegenerate,
  onAddImage,
  isRegenerating,
  isAddingImage,
}: PropertiesPanelProps) {
  const { presentation, updateSlide, setTheme } = useSlidesStore();
  const [regenerateHint, setRegenerateHint] = useState("");

  if (!presentation) return null;

  const slide = presentation.slides[activeIndex];
  if (!slide) return null;

  const handleNotesChange = (notes: string) => {
    updateSlide(activeIndex, { ...slide, notes });
  };

  return (
    <div className="w-72 bg-slate-50 border-l border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto">
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-2">Тип слайда</h3>
        <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
          {SLIDE_TYPES.find((t) => t.type === slide.type)?.label || slide.type}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-2">Тема</h3>
        <div className="flex gap-2">
          {(Object.keys(themes) as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg border text-sm transition-all",
                presentation.theme === t
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              {themes[t].name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-2">Заметки докладчика</h3>
        <textarea
          value={slide.notes || ""}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Заметки для себя..."
          className="w-full h-24 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="text-sm font-medium text-slate-700 mb-2">Действия</h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={regenerateHint}
              onChange={(e) => setRegenerateHint(e.target.value)}
              placeholder="Подсказка (опционально)"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => {
              onRegenerate(regenerateHint || undefined);
              setRegenerateHint("");
            }}
            disabled={isRegenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isRegenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Перегенерировать
          </button>

          <button
            onClick={onAddImage}
            disabled={isAddingImage || !!slide.image}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isAddingImage ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ImagePlus size={16} />
            )}
            {slide.image ? "Картинка добавлена" : "Добавить иллюстрацию"}
          </button>

          {slide.image && (
            <button
              onClick={() => {
                const { image: _unusedImage, ...rest } = slide;
                updateSlide(activeIndex, rest as Slide);
              }}
              className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm"
            >
              Убрать картинку
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ExportDropdown({ onExport }: { onExport: (format: "pdf" | "pptx" | "json") => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium"
      >
        <Download size={16} />
        Экспорт
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
            <button
              onClick={() => { onExport("pdf"); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100"
            >
              PDF
            </button>
            <button
              onClick={() => { onExport("pptx"); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100"
            >
              PowerPoint
            </button>
            <button
              onClick={() => { onExport("json"); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100"
            >
              JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface SlidesEditorProps {
  onPresent: () => void;
  onExport: (format: "pdf" | "pptx" | "json") => void;
}

export function SlidesEditor({ onPresent, onExport }: SlidesEditorProps) {
  const {
    presentation,
    updateSlide,
    undo,
    redo,
    canUndo,
    canRedo,
    generationMode,
  } = useSlidesStore();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAddingImage, setIsAddingImage] = useState(false);

  useEffect(() => {
    if (presentation && activeIndex >= presentation.slides.length) {
      const newIndex = Math.max(0, presentation.slides.length - 1);
      queueMicrotask(() => setActiveIndex(newIndex));
    }
  }, [presentation, activeIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo()) redo();
        } else {
          if (canUndo()) undo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleSlideEdit = useCallback(
    (field: string, value: unknown) => {
      if (!presentation) return;
      const slide = presentation.slides[activeIndex];
      if (!slide) return;
      updateSlide(activeIndex, { ...slide, [field]: value } as Slide);
    },
    [presentation, activeIndex, updateSlide]
  );

  const handleRegenerate = async (hint?: string) => {
    if (!presentation) return;
    const slide = presentation.slides[activeIndex];
    if (!slide) return;

    setIsRegenerating(true);
    try {
      const response = await fetch("/api/slides/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slide,
          context: {
            prevTitle: activeIndex > 0 ? getSlideTitle(presentation.slides[activeIndex - 1]) : undefined,
            nextTitle:
              activeIndex < presentation.slides.length - 1
                ? getSlideTitle(presentation.slides[activeIndex + 1])
                : undefined,
          },
          hint,
        }),
      });

      if (response.ok) {
        const newSlide = await response.json();
        updateSlide(activeIndex, newSlide);
      }
    } catch (error) {
      console.error("Regeneration failed:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAddImage = async () => {
    if (!presentation) return;
    const slide = presentation.slides[activeIndex];
    if (!slide || slide.image) return;

    const prompt = slide.imagePrompt || ("title" in slide ? slide.title : "presentation slide");

    setIsAddingImage(true);
    try {
      const response = await fetch("/api/slides/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.url) {
          updateSlide(activeIndex, {
            ...slide,
            image: { url: result.url, prompt, source: "higgsfield" },
          } as Slide);
        }
      }
    } catch (error) {
      console.error("Image generation failed:", error);
    } finally {
      setIsAddingImage(false);
    }
  };

  if (!presentation) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        Сначала сгенерируйте презентацию
      </div>
    );
  }

  const activeSlide = presentation.slides[activeIndex];
  const editorScale = Math.min(
    (window.innerWidth - 336 - 288 - 80) / SLIDE_WIDTH,
    (window.innerHeight - 160) / SLIDE_HEIGHT,
    0.8
  );

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <SlidesPanel activeIndex={activeIndex} onSelect={setActiveIndex} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => undo()}
              disabled={!canUndo()}
              className="p-2 rounded hover:bg-slate-100 disabled:opacity-30"
              title="Отменить (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={() => redo()}
              disabled={!canRedo()}
              className="p-2 rounded hover:bg-slate-100 disabled:opacity-30"
              title="Повторить (Ctrl+Shift+Z)"
            >
              <Redo2 size={18} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <span className="text-sm text-slate-500">
              Слайд {activeIndex + 1} из {presentation.slides.length}
            </span>
            {generationMode && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  generationMode === "rule_based"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
                )}
              >
                {generationMode === "rule_based" ? "без AI" : "AI"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onPresent}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Play size={16} />
              Показать
            </button>
            <ExportDropdown onExport={onExport} />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-slate-200 p-8 overflow-auto">
          {activeSlide && (
            <div className="shadow-2xl rounded-lg overflow-hidden">
              <SlideRenderer
                slide={activeSlide}
                theme={presentation.theme}
                scale={editorScale}
                editable
                onEdit={handleSlideEdit}
              />
            </div>
          )}
        </div>
      </div>

      <PropertiesPanel
        activeIndex={activeIndex}
        onRegenerate={handleRegenerate}
        onAddImage={handleAddImage}
        isRegenerating={isRegenerating}
        isAddingImage={isAddingImage}
      />
    </div>
  );
}
