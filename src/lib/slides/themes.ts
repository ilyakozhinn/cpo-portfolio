import type { Theme } from "./schema";

export interface ThemeConfig {
  name: string;
  background: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  surface: string;
  border: string;
  fontHeading: string;
  fontBody: string;
}

export const themes: Record<Theme, ThemeConfig> = {
  clean: {
    name: "Clean",
    background: "#ffffff",
    text: "#1a1a1a",
    textMuted: "#666666",
    accent: "#2563eb",
    accentText: "#ffffff",
    surface: "#f8fafc",
    border: "#e2e8f0",
    fontHeading: "Inter, system-ui, sans-serif",
    fontBody: "Inter, system-ui, sans-serif",
  },
  midnight: {
    name: "Midnight",
    background: "#0f172a",
    text: "#f1f5f9",
    textMuted: "#94a3b8",
    accent: "#38bdf8",
    accentText: "#0f172a",
    surface: "#1e293b",
    border: "#334155",
    fontHeading: "Inter, system-ui, sans-serif",
    fontBody: "Inter, system-ui, sans-serif",
  },
  bold: {
    name: "Bold",
    background: "#7c3aed",
    text: "#ffffff",
    textMuted: "#e9d5ff",
    accent: "#fbbf24",
    accentText: "#1a1a1a",
    surface: "#8b5cf6",
    border: "#a78bfa",
    fontHeading: "Inter, system-ui, sans-serif",
    fontBody: "Inter, system-ui, sans-serif",
  },
};

export function getThemeStyles(theme: Theme): string {
  const t = themes[theme];
  return `
    --slide-bg: ${t.background};
    --slide-text: ${t.text};
    --slide-text-muted: ${t.textMuted};
    --slide-accent: ${t.accent};
    --slide-accent-text: ${t.accentText};
    --slide-surface: ${t.surface};
    --slide-border: ${t.border};
    --slide-font-heading: ${t.fontHeading};
    --slide-font-body: ${t.fontBody};
  `;
}

export function getThemeCSSVars(theme: Theme): React.CSSProperties {
  const t = themes[theme];
  return {
    "--slide-bg": t.background,
    "--slide-text": t.text,
    "--slide-text-muted": t.textMuted,
    "--slide-accent": t.accent,
    "--slide-accent-text": t.accentText,
    "--slide-surface": t.surface,
    "--slide-border": t.border,
    "--slide-font-heading": t.fontHeading,
    "--slide-font-body": t.fontBody,
  } as React.CSSProperties;
}
