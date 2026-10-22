"use client";

import type { Presentation, Slide } from "@/lib/slides/schema";
import { themes } from "@/lib/slides/themes";

export function exportToJSON(presentation: Presentation): void {
  const blob = new Blob([JSON.stringify(presentation, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(presentation.title)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportToPDF(presentation: Presentation): Promise<void> {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Не удалось открыть окно печати. Проверьте настройки попапов.");
    return;
  }

  const theme = themes[presentation.theme];
  const slideStyles = generateSlideStyles(theme);

  const slidesHTML = presentation.slides
    .map((slide) => generateSlideHTML(slide, theme))
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(presentation.title)}</title>
  <style>
    @page {
      size: 1280px 720px;
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: Inter, system-ui, sans-serif;
    }
    
    .slide {
      width: 1280px;
      height: 720px;
      page-break-after: always;
      page-break-inside: avoid;
      position: relative;
      overflow: hidden;
      ${slideStyles}
    }
    
    .slide:last-child {
      page-break-after: auto;
    }
    
    .slide-title {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 80px;
    }
    
    .slide-title h1 {
      font-size: 64px;
      font-weight: 700;
      line-height: 1.2;
    }
    
    .slide-title h2 {
      font-size: 32px;
      margin-top: 32px;
      opacity: 0.7;
    }
    
    .slide-content {
      padding: 64px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .slide-content h2 {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 48px;
    }
    
    .bullets {
      list-style: none;
    }
    
    .bullets li {
      font-size: 28px;
      padding: 12px 0;
      padding-left: 32px;
      position: relative;
    }
    
    .bullets li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 22px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent);
    }
    
    .quote-slide {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 80px;
    }
    
    .quote-slide blockquote {
      font-size: 40px;
      font-style: italic;
      max-width: 900px;
      line-height: 1.5;
    }
    
    .quote-slide cite {
      font-size: 24px;
      margin-top: 40px;
      opacity: 0.7;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 32px;
      flex: 1;
      align-items: center;
    }
    
    .stat-card {
      background: var(--surface);
      border-radius: 16px;
      padding: 48px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 64px;
      font-weight: 700;
      color: var(--accent);
    }
    
    .stat-label {
      font-size: 20px;
      margin-top: 16px;
      opacity: 0.7;
    }
    
    .columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      flex: 1;
    }
    
    .column {
      background: var(--surface);
      border-radius: 16px;
      padding: 32px;
    }
    
    .column h3 {
      font-size: 28px;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 24px;
    }
    
    .summary-list {
      list-style: none;
    }
    
    .summary-list li {
      font-size: 28px;
      padding: 8px 0;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .summary-number {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--accent);
      color: var(--accent-text);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      flex-shrink: 0;
    }
    
    .cta {
      font-size: 32px;
      font-weight: 600;
      color: var(--accent);
      margin-top: 48px;
    }
    
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${slidesHTML}
  <script>window.onload = () => window.print();</script>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export async function exportToPPTX(presentation: Presentation): Promise<void> {
  const pptxgenjs = await import("pptxgenjs");
  const PptxGenJS = pptxgenjs.default;

  const pptx = new PptxGenJS();
  pptx.title = presentation.title;
  pptx.author = "Slides Generator";

  const theme = themes[presentation.theme];

  const bgColor = theme.background.replace("#", "");
  const textColor = theme.text.replace("#", "");
  const accentColor = theme.accent.replace("#", "");
  const surfaceColor = theme.surface.replace("#", "");

  for (const slide of presentation.slides) {
    const pptSlide = pptx.addSlide();
    pptSlide.background = { color: bgColor };

    switch (slide.type) {
      case "title":
        pptSlide.addText(slide.title, {
          x: 0.5,
          y: 2.5,
          w: "90%",
          h: 1.5,
          fontSize: 54,
          bold: true,
          color: textColor,
          align: "center",
          valign: "middle",
        });
        if (slide.subtitle) {
          pptSlide.addText(slide.subtitle, {
            x: 0.5,
            y: 4.2,
            w: "90%",
            h: 0.8,
            fontSize: 28,
            color: textColor,
            align: "center",
            valign: "middle",
          });
        }
        break;

      case "bullets":
        pptSlide.addText(slide.title, {
          x: 0.5,
          y: 0.5,
          w: "90%",
          h: 1,
          fontSize: 40,
          bold: true,
          color: textColor,
        });
        pptSlide.addText(
          slide.bullets.map((b) => ({
            text: b,
            options: {
              bullet: { type: "bullet", color: accentColor },
              fontSize: 24,
              color: textColor,
              breakLine: true,
            },
          })),
          { x: 0.5, y: 1.8, w: "90%", h: 4 }
        );
        break;

      case "quote":
        pptSlide.addText(`"${slide.quote}"`, {
          x: 1,
          y: 2,
          w: "80%",
          h: 2,
          fontSize: 32,
          italic: true,
          color: textColor,
          align: "center",
          valign: "middle",
        });
        if (slide.author) {
          pptSlide.addText(`— ${slide.author}`, {
            x: 1,
            y: 4.2,
            w: "80%",
            h: 0.6,
            fontSize: 20,
            color: textColor,
            align: "center",
          });
        }
        break;

      case "stats":
        if (slide.title) {
          pptSlide.addText(slide.title, {
            x: 0.5,
            y: 0.5,
            w: "90%",
            h: 0.8,
            fontSize: 36,
            bold: true,
            color: textColor,
          });
        }
        const statWidth = slide.stats.length <= 2 ? 4 : 2;
        const statGap = 0.5;
        const totalWidth = slide.stats.length * statWidth + (slide.stats.length - 1) * statGap;
        const startX = (10 - totalWidth) / 2;

        slide.stats.forEach((stat, i) => {
          const x = startX + i * (statWidth + statGap);
          pptSlide.addShape("rect", {
            x,
            y: 2,
            w: statWidth,
            h: 2.5,
            fill: { color: surfaceColor },
            line: { color: surfaceColor },
          });
          pptSlide.addText(stat.value, {
            x,
            y: 2.2,
            w: statWidth,
            h: 1.2,
            fontSize: 48,
            bold: true,
            color: accentColor,
            align: "center",
          });
          pptSlide.addText(stat.label, {
            x,
            y: 3.5,
            w: statWidth,
            h: 0.8,
            fontSize: 16,
            color: textColor,
            align: "center",
          });
        });
        break;

      case "two_columns":
        pptSlide.addText(slide.title, {
          x: 0.5,
          y: 0.5,
          w: "90%",
          h: 0.8,
          fontSize: 36,
          bold: true,
          color: textColor,
        });

        const colWidth = 4.2;
        const colStartX = 0.8;

        [slide.left, slide.right].forEach((col, colIndex) => {
          const x = colStartX + colIndex * (colWidth + 0.6);
          pptSlide.addShape("rect", {
            x,
            y: 1.6,
            w: colWidth,
            h: 3.5,
            fill: { color: surfaceColor },
            line: { color: surfaceColor },
          });
          pptSlide.addText(col.heading, {
            x: x + 0.3,
            y: 1.8,
            w: colWidth - 0.6,
            h: 0.6,
            fontSize: 24,
            bold: true,
            color: accentColor,
          });
          pptSlide.addText(
            col.bullets.map((b) => ({
              text: b,
              options: {
                bullet: { type: "bullet", color: accentColor },
                fontSize: 18,
                color: textColor,
                breakLine: true,
              },
            })),
            { x: x + 0.3, y: 2.6, w: colWidth - 0.6, h: 2.3 }
          );
        });
        break;

      case "summary":
        pptSlide.addText(slide.title, {
          x: 0.5,
          y: 0.5,
          w: "90%",
          h: 0.8,
          fontSize: 40,
          bold: true,
          color: textColor,
          align: "center",
        });
        slide.bullets.forEach((bullet, i) => {
          pptSlide.addShape("ellipse", {
            x: 1.5,
            y: 1.8 + i * 0.9,
            w: 0.5,
            h: 0.5,
            fill: { color: accentColor },
          });
          pptSlide.addText(String(i + 1), {
            x: 1.5,
            y: 1.8 + i * 0.9,
            w: 0.5,
            h: 0.5,
            fontSize: 16,
            bold: true,
            color: theme.accentText.replace("#", ""),
            align: "center",
            valign: "middle",
          });
          pptSlide.addText(bullet, {
            x: 2.2,
            y: 1.8 + i * 0.9,
            w: "70%",
            h: 0.5,
            fontSize: 22,
            color: textColor,
            valign: "middle",
          });
        });
        if (slide.cta) {
          pptSlide.addText(slide.cta, {
            x: 0.5,
            y: 4.5,
            w: "90%",
            h: 0.8,
            fontSize: 28,
            bold: true,
            color: accentColor,
            align: "center",
          });
        }
        break;
    }

    if (slide.notes) {
      pptSlide.addNotes(slide.notes);
    }
  }

  await pptx.writeFile({ fileName: `${sanitizeFilename(presentation.title)}.pptx` });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Zа-яА-Я0-9\s-_]/g, "").slice(0, 50) || "presentation";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateSlideStyles(theme: typeof themes.clean): string {
  return `
    background: ${theme.background};
    color: ${theme.text};
    --accent: ${theme.accent};
    --accent-text: ${theme.accentText};
    --surface: ${theme.surface};
  `;
}

function generateSlideHTML(slide: Slide, _theme: typeof themes.clean): string {

  switch (slide.type) {
    case "title":
      return `
        <div class="slide">
          <div class="slide-title">
            <h1>${escapeHtml(slide.title)}</h1>
            ${slide.subtitle ? `<h2>${escapeHtml(slide.subtitle)}</h2>` : ""}
          </div>
        </div>
      `;

    case "bullets":
      return `
        <div class="slide">
          <div class="slide-content">
            <h2>${escapeHtml(slide.title)}</h2>
            <ul class="bullets">
              ${slide.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
            </ul>
          </div>
        </div>
      `;

    case "quote":
      return `
        <div class="slide">
          <div class="quote-slide">
            <blockquote>"${escapeHtml(slide.quote)}"</blockquote>
            ${slide.author ? `<cite>— ${escapeHtml(slide.author)}</cite>` : ""}
          </div>
        </div>
      `;

    case "stats":
      return `
        <div class="slide">
          <div class="slide-content">
            ${slide.title ? `<h2>${escapeHtml(slide.title)}</h2>` : ""}
            <div class="stats-grid">
              ${slide.stats
                .map(
                  (s) => `
                <div class="stat-card">
                  <div class="stat-value">${escapeHtml(s.value)}</div>
                  <div class="stat-label">${escapeHtml(s.label)}</div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
      `;

    case "two_columns":
      return `
        <div class="slide">
          <div class="slide-content">
            <h2>${escapeHtml(slide.title)}</h2>
            <div class="columns">
              ${[slide.left, slide.right]
                .map(
                  (col) => `
                <div class="column">
                  <h3>${escapeHtml(col.heading)}</h3>
                  <ul class="bullets">
                    ${col.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
                  </ul>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
      `;

    case "summary":
      return `
        <div class="slide">
          <div class="slide-content" style="align-items: center; text-align: center;">
            <h2>${escapeHtml(slide.title)}</h2>
            <ul class="summary-list">
              ${slide.bullets
                .map(
                  (b, i) => `
                <li>
                  <span class="summary-number">${i + 1}</span>
                  ${escapeHtml(b)}
                </li>
              `
                )
                .join("")}
            </ul>
            ${slide.cta ? `<div class="cta">${escapeHtml(slide.cta)}</div>` : ""}
          </div>
        </div>
      `;

    default:
      return "";
  }
}
