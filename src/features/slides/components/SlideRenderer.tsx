"use client";

import type { Slide, Theme } from "@/lib/slides/schema";
import { getThemeCSSVars } from "@/lib/slides/themes";
import { cn } from "@/lib/utils";

interface SlideRendererProps {
  slide: Slide;
  theme: Theme;
  scale?: number;
  className?: string;
  editable?: boolean;
  onEdit?: (field: string, value: unknown) => void;
}

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

function EditableText({
  value,
  onChange,
  editable,
  className,
  placeholder,
  multiline = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  editable?: boolean;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  if (!editable) {
    return <span className={className}>{value || placeholder}</span>;
  }

  const Tag = multiline ? "textarea" : "input";

  return (
    <Tag
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn(
        "bg-transparent border-none outline-none w-full resize-none focus:ring-2 focus:ring-[var(--slide-accent)] rounded",
        className
      )}
      placeholder={placeholder}
      rows={multiline ? 3 : undefined}
    />
  );
}

function SlideImage({ url, className }: { url?: string; className?: string }) {
  if (!url) return null;
  return (
    <div className={cn("overflow-hidden rounded-lg", className)}>
      <img
        src={url}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

function TitleSlideContent({
  slide,
  editable,
  onEdit,
}: {
  slide: Extract<Slide, { type: "title" }>;
  editable?: boolean;
  onEdit?: (field: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-20">
      <EditableText
        value={slide.title}
        onChange={(v) => onEdit?.("title", v)}
        editable={editable}
        className="text-7xl font-bold leading-tight text-[var(--slide-text)]"
        placeholder="Заголовок"
      />
      {(slide.subtitle || editable) && (
        <EditableText
          value={slide.subtitle || ""}
          onChange={(v) => onEdit?.("subtitle", v)}
          editable={editable}
          className="text-3xl mt-8 text-[var(--slide-text-muted)]"
          placeholder="Подзаголовок"
        />
      )}
      {slide.image && (
        <SlideImage
          url={slide.image.url}
          className="absolute inset-0 opacity-20 -z-10"
        />
      )}
    </div>
  );
}

function BulletsSlideContent({
  slide,
  editable,
  onEdit,
}: {
  slide: Extract<Slide, { type: "bullets" }>;
  editable?: boolean;
  onEdit?: (field: string, value: string | string[]) => void;
}) {
  const handleBulletChange = (index: number, value: string) => {
    const newBullets = [...slide.bullets];
    newBullets[index] = value;
    onEdit?.("bullets", newBullets);
  };

  return (
    <div className={cn("flex h-full", slide.image ? "gap-12" : "")}>
      <div className={cn("flex flex-col justify-center px-16 py-12", slide.image ? "w-1/2" : "w-full")}>
        <EditableText
          value={slide.title}
          onChange={(v) => onEdit?.("title", v)}
          editable={editable}
          className="text-5xl font-bold mb-12 text-[var(--slide-text)]"
          placeholder="Заголовок"
        />
        <ul className="space-y-6">
          {slide.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-4 text-2xl text-[var(--slide-text)]">
              <span className="w-3 h-3 rounded-full bg-[var(--slide-accent)] mt-3 flex-shrink-0" />
              <EditableText
                value={bullet}
                onChange={(v) => handleBulletChange(i, v)}
                editable={editable}
                className="flex-1"
                placeholder={`Пункт ${i + 1}`}
              />
            </li>
          ))}
        </ul>
      </div>
      {slide.image && (
        <SlideImage url={slide.image.url} className="w-1/2 h-full" />
      )}
    </div>
  );
}

function QuoteSlideContent({
  slide,
  editable,
  onEdit,
}: {
  slide: Extract<Slide, { type: "quote" }>;
  editable?: boolean;
  onEdit?: (field: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-20 text-center relative">
      <div className="text-[200px] absolute top-8 left-16 text-[var(--slide-accent)] opacity-20 font-serif leading-none">
        &quot;
      </div>
      <EditableText
        value={slide.quote}
        onChange={(v) => onEdit?.("quote", v)}
        editable={editable}
        className="text-4xl font-medium italic leading-relaxed text-[var(--slide-text)] max-w-4xl"
        placeholder="Цитата"
        multiline
      />
      {(slide.author || editable) && (
        <EditableText
          value={slide.author || ""}
          onChange={(v) => onEdit?.("author", v)}
          editable={editable}
          className="text-2xl mt-10 text-[var(--slide-text-muted)]"
          placeholder="— Автор"
        />
      )}
      {slide.image && (
        <SlideImage
          url={slide.image.url}
          className="absolute inset-0 opacity-10 -z-10"
        />
      )}
    </div>
  );
}

function StatsSlideContent({
  slide,
  editable,
  onEdit,
}: {
  slide: Extract<Slide, { type: "stats" }>;
  editable?: boolean;
  onEdit?: (field: string, value: string | { value: string; label: string }[]) => void;
}) {
  const handleStatChange = (index: number, field: "value" | "label", val: string) => {
    const newStats = [...slide.stats];
    newStats[index] = { ...newStats[index], [field]: val };
    onEdit?.("stats", newStats);
  };

  return (
    <div className="flex flex-col h-full px-16 py-12">
      {(slide.title || editable) && (
        <EditableText
          value={slide.title || ""}
          onChange={(v) => onEdit?.("title", v)}
          editable={editable}
          className="text-5xl font-bold mb-16 text-[var(--slide-text)]"
          placeholder="Заголовок"
        />
      )}
      <div className={cn(
        "flex-1 grid gap-8 items-center",
        slide.stats.length <= 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"
      )}>
        {slide.stats.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center p-8 bg-[var(--slide-surface)] rounded-2xl"
          >
            <EditableText
              value={stat.value}
              onChange={(v) => handleStatChange(i, "value", v)}
              editable={editable}
              className="text-6xl font-bold text-[var(--slide-accent)]"
              placeholder="0"
            />
            <EditableText
              value={stat.label}
              onChange={(v) => handleStatChange(i, "label", v)}
              editable={editable}
              className="text-xl mt-4 text-[var(--slide-text-muted)] text-center"
              placeholder="Метка"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TwoColumnsSlideContent({
  slide,
  editable,
  onEdit,
}: {
  slide: Extract<Slide, { type: "two_columns" }>;
  editable?: boolean;
  onEdit?: (field: string, value: unknown) => void;
}) {
  const handleColumnBulletChange = (
    side: "left" | "right",
    index: number,
    value: string
  ) => {
    const column = slide[side];
    const newBullets = [...column.bullets];
    newBullets[index] = value;
    onEdit?.(side, { ...column, bullets: newBullets });
  };

  const handleColumnHeadingChange = (side: "left" | "right", value: string) => {
    onEdit?.(side, { ...slide[side], heading: value });
  };

  return (
    <div className="flex flex-col h-full px-16 py-12">
      <EditableText
        value={slide.title}
        onChange={(v) => onEdit?.("title", v)}
        editable={editable}
        className="text-5xl font-bold mb-12 text-[var(--slide-text)]"
        placeholder="Заголовок"
      />
      <div className="flex-1 grid grid-cols-2 gap-12">
        {(["left", "right"] as const).map((side) => (
          <div
            key={side}
            className="bg-[var(--slide-surface)] rounded-2xl p-8"
          >
            <EditableText
              value={slide[side].heading}
              onChange={(v) => handleColumnHeadingChange(side, v)}
              editable={editable}
              className="text-3xl font-semibold mb-8 text-[var(--slide-accent)]"
              placeholder="Заголовок колонки"
            />
            <ul className="space-y-4">
              {slide[side].bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-xl text-[var(--slide-text)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--slide-accent)] mt-2.5 flex-shrink-0" />
                  <EditableText
                    value={bullet}
                    onChange={(v) => handleColumnBulletChange(side, i, v)}
                    editable={editable}
                    className="flex-1"
                    placeholder={`Пункт ${i + 1}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummarySlideContent({
  slide,
  editable,
  onEdit,
}: {
  slide: Extract<Slide, { type: "summary" }>;
  editable?: boolean;
  onEdit?: (field: string, value: string | string[]) => void;
}) {
  const handleBulletChange = (index: number, value: string) => {
    const newBullets = [...slide.bullets];
    newBullets[index] = value;
    onEdit?.("bullets", newBullets);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-20 text-center">
      <EditableText
        value={slide.title}
        onChange={(v) => onEdit?.("title", v)}
        editable={editable}
        className="text-5xl font-bold mb-12 text-[var(--slide-text)]"
        placeholder="Итоги"
      />
      <ul className="space-y-4 mb-12">
        {slide.bullets.map((bullet, i) => (
          <li key={i} className="flex items-center gap-4 text-2xl text-[var(--slide-text)]">
            <span className="w-8 h-8 rounded-full bg-[var(--slide-accent)] flex items-center justify-center text-[var(--slide-accent-text)] font-bold text-lg">
              {i + 1}
            </span>
            <EditableText
              value={bullet}
              onChange={(v) => handleBulletChange(i, v)}
              editable={editable}
              placeholder={`Пункт ${i + 1}`}
            />
          </li>
        ))}
      </ul>
      {(slide.cta || editable) && (
        <EditableText
          value={slide.cta || ""}
          onChange={(v) => onEdit?.("cta", v)}
          editable={editable}
          className="text-3xl font-semibold text-[var(--slide-accent)] mt-8"
          placeholder="Вопросы?"
        />
      )}
    </div>
  );
}

export function SlideRenderer({
  slide,
  theme,
  scale = 1,
  className,
  editable = false,
  onEdit,
}: SlideRendererProps) {
  const themeVars = getThemeCSSVars(theme);

  const renderContent = () => {
    switch (slide.type) {
      case "title":
        return <TitleSlideContent slide={slide} editable={editable} onEdit={onEdit} />;
      case "bullets":
        return <BulletsSlideContent slide={slide} editable={editable} onEdit={onEdit} />;
      case "quote":
        return <QuoteSlideContent slide={slide} editable={editable} onEdit={onEdit} />;
      case "stats":
        return <StatsSlideContent slide={slide} editable={editable} onEdit={onEdit} />;
      case "two_columns":
        return <TwoColumnsSlideContent slide={slide} editable={editable} onEdit={onEdit} />;
      case "summary":
        return <SummarySlideContent slide={slide} editable={editable} onEdit={onEdit} />;
      default:
        return <div>Неизвестный тип слайда</div>;
    }
  };

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        width: SLIDE_WIDTH * scale,
        height: SLIDE_HEIGHT * scale,
        ...themeVars,
      }}
    >
      <div
        className="absolute inset-0 bg-[var(--slide-bg)]"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          fontFamily: "var(--slide-font-body)",
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
}

export { SLIDE_WIDTH, SLIDE_HEIGHT };
