import type { Slide, GenerateSettings, Presentation } from "./schema";

function generateId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

interface ParsedBlock {
  type: "heading" | "bullets" | "quote" | "stats" | "paragraph";
  level?: number;
  content: string;
  items?: string[];
}

function parseMarkdown(text: string): ParsedBlock[] {
  const lines = text.split("\n");
  const blocks: ParsedBlock[] = [];
  let currentBullets: string[] = [];

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      blocks.push({ type: "bullets", content: "", items: [...currentBullets] });
      currentBullets = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushBullets();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushBullets();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      currentBullets.push(bulletMatch[1].trim());
      continue;
    }

    const numberedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (numberedMatch) {
      currentBullets.push(numberedMatch[1].trim());
      continue;
    }

    const quoteMatch = line.match(/^["""«](.+?)["""»](?:\s*[-—]\s*(.+))?$/);
    if (quoteMatch) {
      flushBullets();
      blocks.push({
        type: "quote",
        content: quoteMatch[1].trim(),
        items: quoteMatch[2] ? [quoteMatch[2].trim()] : undefined,
      });
      continue;
    }

    const statsMatch = line.match(
      /(\d+[\d.,]*%?|\d+[xXхХ]|\$[\d.,]+[kmKMКкМм]?|\d+[kmKMКкМм])/g
    );
    if (statsMatch && statsMatch.length >= 2) {
      flushBullets();
      blocks.push({ type: "stats", content: line, items: statsMatch });
      continue;
    }

    flushBullets();
    blocks.push({ type: "paragraph", content: line });
  }

  flushBullets();
  return blocks;
}

function extractTitle(block: ParsedBlock): string {
  if (block.type === "heading") return block.content;
  const sentences = block.content.split(/[.!?]/);
  return sentences[0]?.slice(0, 80) || "Слайд";
}

function extractBullets(block: ParsedBlock, max = 6): string[] {
  if (block.items && block.items.length > 0) {
    return block.items.slice(0, max).map((b) => b.slice(0, 90));
  }
  const sentences = block.content
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.slice(0, max).map((s) => s.slice(0, 90));
}

function detectStats(text: string): { value: string; label: string }[] {
  const stats: { value: string; label: string }[] = [];
  const regex = /(\d+[\d.,]*%?|\d+[xXхХ]|\$[\d.,]+[kmKMКкМм]?)\s*[-—:]?\s*([^,.\n]{3,50})/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    stats.push({
      value: match[1].slice(0, 20),
      label: match[2].trim().slice(0, 50),
    });
  }
  return stats.slice(0, 4);
}

export function parseTextToSlides(settings: GenerateSettings): Presentation {
  const { text, slideCount, theme, language } = settings;
  const blocks = parseMarkdown(text);

  const slides: Slide[] = [];
  let slideIndex = 0;

  const firstHeading = blocks.find((b) => b.type === "heading");
  const presentationTitle = firstHeading?.content || "Презентация";

  slides.push({
    id: generateId(),
    type: "title",
    title: presentationTitle.slice(0, 80),
    subtitle: "",
  });
  slideIndex++;

  const targetCount =
    slideCount === "auto"
      ? Math.min(Math.max(Math.ceil(blocks.length / 2), 5), 15)
      : slideCount;

  const contentBlocks = firstHeading
    ? blocks.filter((b) => b !== firstHeading)
    : blocks;

  for (const block of contentBlocks) {
    if (slides.length >= targetCount - 1) break;

    if (block.type === "quote") {
      slides.push({
        id: generateId(),
        type: "quote",
        quote: block.content.slice(0, 200),
        author: block.items?.[0]?.slice(0, 50),
      });
      slideIndex++;
      continue;
    }

    if (block.type === "stats") {
      const stats = detectStats(block.content);
      if (stats.length >= 2) {
        slides.push({
          id: generateId(),
          type: "stats",
          title: "Результаты",
          stats,
        });
        slideIndex++;
        continue;
      }
    }

    if (block.type === "heading") {
      if (slides.length > 1 && slides[slides.length - 1].type === "bullets") {
        continue;
      }
      const nextBlocks = contentBlocks.slice(
        contentBlocks.indexOf(block) + 1,
        contentBlocks.indexOf(block) + 4
      );
      const bulletItems: string[] = [];
      for (const nb of nextBlocks) {
        if (nb.type === "bullets" && nb.items) {
          bulletItems.push(...nb.items);
        } else if (nb.type === "paragraph") {
          bulletItems.push(nb.content);
        } else if (nb.type === "heading") {
          break;
        }
      }
      if (bulletItems.length > 0) {
        slides.push({
          id: generateId(),
          type: "bullets",
          title: block.content.slice(0, 80),
          bullets: bulletItems.slice(0, 6).map((b) => b.slice(0, 90)),
        });
        slideIndex++;
      }
      continue;
    }

    if (block.type === "bullets" && block.items && block.items.length > 0) {
      const prevSlide = slides[slides.length - 1];
      if (prevSlide && prevSlide.type === "bullets") {
        continue;
      }
      slides.push({
        id: generateId(),
        type: "bullets",
        title: `Пункт ${slideIndex}`,
        bullets: block.items.slice(0, 6).map((b) => b.slice(0, 90)),
      });
      slideIndex++;
      continue;
    }

    if (block.type === "paragraph" && block.content.length > 50) {
      const bullets = extractBullets(block, 4);
      if (bullets.length > 0) {
        slides.push({
          id: generateId(),
          type: "bullets",
          title: extractTitle(block).slice(0, 80),
          bullets,
        });
        slideIndex++;
      }
    }
  }

  const summaryBullets = slides
    .filter((s) => s.type === "bullets" || s.type === "title")
    .slice(0, 5)
    .map((s) => {
      if (s.type === "bullets") return s.title;
      if (s.type === "title") return s.title;
      return "";
    })
    .filter(Boolean)
    .map((t) => t.slice(0, 90));

  if (summaryBullets.length === 0) {
    summaryBullets.push("Спасибо за внимание!");
  }

  slides.push({
    id: generateId(),
    type: "summary",
    title: "Итоги",
    bullets: summaryBullets,
    cta: "Вопросы?",
  });

  return {
    version: 1,
    title: presentationTitle,
    language: language === "auto" ? "ru" : language,
    theme,
    slides,
  };
}
