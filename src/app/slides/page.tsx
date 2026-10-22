"use client";

import { useState, useEffect } from "react";
import {
  Presentation,
  Clock,
  Trash2,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { useSlidesStore } from "@/features/slides/store";
import { TextInput } from "@/features/slides/components/TextInput";
import { SlidesEditor } from "@/features/slides/components/SlidesEditor";
import { PresentationMode } from "@/features/slides/components/PresentationMode";
import {
  exportToJSON,
  exportToPDF,
  exportToPPTX,
} from "@/features/slides/components/ExportUtils";

type View = "input" | "editor" | "present";

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return "только что";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} дн назад`;

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export default function SlidesPage() {
  const [view, setView] = useState<View>("input");
  const [mounted, setMounted] = useState(false);
  const {
    presentation,
    recentPresentations,
    loadFromRecent,
    deleteFromRecent,
    setPresentation,
  } = useSlidesStore();

  useEffect(() => {
    // Using a microtask to avoid the synchronous setState warning
    queueMicrotask(() => setMounted(true));
  }, []);

  const handleGenerated = () => {
    setView("editor");
  };

  const handlePresent = () => {
    setView("present");
  };

  const handleExitPresent = () => {
    setView("editor");
  };

  const handleExport = async (format: "pdf" | "pptx" | "json") => {
    if (!presentation) return;

    switch (format) {
      case "json":
        exportToJSON(presentation);
        break;
      case "pdf":
        await exportToPDF(presentation);
        break;
      case "pptx":
        await exportToPPTX(presentation);
        break;
    }
  };

  const handleNew = () => {
    setPresentation(null);
    setView("input");
  };

  const handleLoadRecent = (id: string) => {
    loadFromRecent(id);
    setView("editor");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Загрузка...</div>
      </div>
    );
  }

  if (view === "present") {
    return <PresentationMode onExit={handleExitPresent} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          {view === "editor" && (
            <button
              onClick={handleNew}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={20} />
              <span className="text-sm">Новая</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <Presentation className="text-blue-600" size={24} />
            <h1 className="text-xl font-semibold text-slate-900">
              Генератор презентаций
            </h1>
          </div>
        </div>
        {presentation && view === "editor" && (
          <div className="text-sm text-slate-500">
            {presentation.slides.length} слайдов
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        {view === "input" ? (
          <div className="flex-1 overflow-y-auto py-8">
            <div className="max-w-4xl mx-auto px-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-3">
                  Превратите текст в презентацию
                </h2>
                <p className="text-slate-600 text-lg">
                  Вставьте заметки, статью или план — получите готовые слайды
                  за секунды
                </p>
              </div>

              <TextInput onGenerated={handleGenerated} />

              {recentPresentations.length > 0 && (
                <div className="mt-12 border-t border-slate-200 pt-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-slate-400" />
                    Недавние презентации
                  </h3>
                  <div className="grid gap-3">
                    {recentPresentations.map((recent) => (
                      <div
                        key={recent.id}
                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all group"
                      >
                        <button
                          onClick={() => handleLoadRecent(recent.id)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <FileText size={20} className="text-slate-400" />
                          <div>
                            <div className="font-medium text-slate-900">
                              {recent.title}
                            </div>
                            <div className="text-sm text-slate-500">
                              {formatDate(recent.updatedAt)}
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => deleteFromRecent(recent.id)}
                          className="p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Удалить"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <SlidesEditor onPresent={handlePresent} onExport={handleExport} />
        )}
      </main>
    </div>
  );
}
