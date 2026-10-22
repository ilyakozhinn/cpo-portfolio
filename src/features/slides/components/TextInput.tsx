"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useSlidesStore } from "../store";
import type { Theme, Language, Tone, Presentation, Slide } from "@/lib/slides/schema";
import { themes } from "@/lib/slides/themes";
import { cn } from "@/lib/utils";

const EXAMPLE_TEXT = `# Как мы выросли в 3 раза

## Что сработало

- Онбординг за 2 минуты
- Реферальная программа с 40% конверсией
- Новый тариф для enterprise-клиентов

## Результаты

3x рост выручки за год
42% retention на 3-м месяце
NPS вырос с 35 до 58

"Продукт, который сам себя продаёт" — один из наших клиентов

## До и после

До: ручной онбординг занимал 2 недели
После: self-serve за 2 минуты

## Итоги

- Фокус на активации первых 5 минут
- Автоматизация рутины
- Слушаем клиентов каждый день

Вопросы?`;

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "auto", label: "Авто" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

const TONES: { value: Tone; label: string }[] = [
  { value: "business", label: "Деловой" },
  { value: "friendly", label: "Дружелюбный" },
  { value: "inspiring", label: "Вдохновляющий" },
  { value: "academic", label: "Академичный" },
];

interface TextInputProps {
  onGenerated: () => void;
}

export function TextInput({ onGenerated }: TextInputProps) {
  const {
    settings,
    setSettings,
    setPresentation,
    setGenerating,
    setGenerationMode,
    setError,
    isGenerating,
    error,
  } = useSlidesStore();

  const [text, setText] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const charCount = text.length;
  const isValid = charCount >= 50 && charCount <= 30000;

  const handleGenerate = async () => {
    if (!isValid) return;

    setGenerating(true);
    setError(null);
    setProgress({ current: 0, total: 0 });

    const slides: Slide[] = [];

    try {
      const response = await fetch("/api/slides/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          ...settings,
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "slide") {
              slides.push(event.data);
              setProgress({ current: slides.length, total: event.total || slides.length });
            } else if (event.type === "done") {
              setGenerationMode(event.mode);
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      if (slides.length > 0) {
        const presentation: Presentation = {
          version: 1,
          title: slides[0]?.type === "title" ? slides[0].title : "Презентация",
          language: settings.language === "auto" ? "ru" : settings.language,
          theme: settings.theme,
          slides,
        };
        setPresentation(presentation);
        onGenerated();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка генерации");
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  const handlePasteExample = () => {
    setText(EXAMPLE_TEXT);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Текст для презентации
          </label>
          <button
            onClick={handlePasteExample}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Вставить пример
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Вставьте текст, заметки или статью. Поддерживается Markdown — заголовки # помогут структурировать презентацию..."
          className="w-full h-64 px-4 py-3 border border-slate-300 rounded-xl text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isGenerating}
        />
        <div className="flex justify-between mt-2 text-sm">
          <span className={cn(
            charCount < 50 ? "text-amber-600" : charCount > 30000 ? "text-red-600" : "text-slate-500"
          )}>
            {charCount.toLocaleString()} / 30 000 символов
            {charCount < 50 && " (минимум 50)"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Слайдов
          </label>
          <select
            value={settings.slideCount === "auto" ? "auto" : settings.slideCount}
            onChange={(e) =>
              setSettings({
                slideCount: e.target.value === "auto" ? "auto" : Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          >
            <option value="auto">Авто</option>
            {Array.from({ length: 18 }, (_, i) => i + 3).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Язык
          </label>
          <select
            value={settings.language}
            onChange={(e) => setSettings({ language: e.target.value as Language })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Тон
          </label>
          <select
            value={settings.tone}
            onChange={(e) => setSettings({ tone: e.target.value as Tone })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          >
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Тема
          </label>
          <select
            value={settings.theme}
            onChange={(e) => setSettings({ theme: e.target.value as Theme })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          >
            {(Object.keys(themes) as Theme[]).map((t) => (
              <option key={t} value={t}>
                {themes[t].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        {(Object.keys(themes) as Theme[]).map((t) => (
          <button
            key={t}
            onClick={() => setSettings({ theme: t })}
            className={cn(
              "flex-1 h-16 rounded-xl border-2 transition-all overflow-hidden",
              settings.theme === t
                ? "border-blue-500 shadow-md"
                : "border-slate-200 hover:border-slate-300"
            )}
            style={{ background: themes[t].background }}
          >
            <div className="h-full flex flex-col items-center justify-center">
              <span
                className="text-xs font-medium"
                style={{ color: themes[t].text }}
              >
                {themes[t].name}
              </span>
              <div
                className="w-6 h-1 rounded-full mt-1"
                style={{ background: themes[t].accent }}
              />
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!isValid || isGenerating}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium transition-all"
      >
        {isGenerating ? (
          <>
            <Loader2 size={24} className="animate-spin" />
            {progress ? `Слайд ${progress.current}...` : "Генерация..."}
          </>
        ) : (
          <>
            <Sparkles size={24} />
            Создать презентацию
          </>
        )}
      </button>
    </div>
  );
}
