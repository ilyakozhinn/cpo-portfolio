import type { Tone, Language } from "./schema";

const TONE_DESCRIPTIONS: Record<Tone, string> = {
  business: "деловой, профессиональный, чёткий",
  friendly: "дружелюбный, неформальный, живой",
  inspiring: "вдохновляющий, мотивирующий, эмоциональный",
  academic: "академичный, строгий, научный",
};

const LANGUAGE_INSTRUCTIONS: Record<Language, string> = {
  auto: "Определи язык текста автоматически и используй его для слайдов.",
  ru: "Пиши все слайды на русском языке.",
  en: "Write all slides in English.",
};

export function buildSystemPrompt(language: Language, tone: Tone): string {
  return `Ты — редактор презентаций. Твоя задача — превратить текст пользователя в структурированную презентацию.

ПРАВИЛА:
1. Один слайд = одна мысль. Не перегружай слайды.
2. Сохраняй все факты и цифры из исходного текста. НЕ выдумывай данные.
3. Пиши кратко и ёмко. Избегай воды.
4. Используй ${TONE_DESCRIPTIONS[tone]} тон.
5. ${LANGUAGE_INSTRUCTIONS[language]}

ТИПЫ СЛАЙДОВ:
- title: заголовок презентации, используй первым
- bullets: перечисление, аргументы (3-6 пунктов)
- quote: яркая цитата из текста
- stats: числа и метрики (2-4 значения, только из текста!)
- two_columns: сравнение, до/после, плюсы/минусы
- summary: итог, используй последним

ФОРМАТ ВЫВОДА:
Отвечай строго JSON по схеме. Каждый слайд имеет уникальный id (s1, s2...).
Для слайдов, где уместна иллюстрация, добавь поле imagePrompt с кратким описанием картинки на английском.`;
}

export function buildUserPrompt(
  text: string,
  slideCount: number | "auto",
  tone: Tone
): string {
  const countInstruction =
    slideCount === "auto"
      ? "Определи оптимальное количество слайдов (5-15)"
      : `Создай ровно ${slideCount} слайдов`;

  return `${countInstruction}.

Тон: ${TONE_DESCRIPTIONS[tone]}

ТЕКСТ ДЛЯ ПРЕЗЕНТАЦИИ:
---
${text}
---

Создай JSON-презентацию по этому тексту.`;
}

export function buildRegeneratePrompt(
  currentSlide: string,
  context: { prevTitle?: string; nextTitle?: string },
  hint?: string
): string {
  let prompt = `Перегенерируй этот слайд:
${currentSlide}

`;

  if (context.prevTitle || context.nextTitle) {
    prompt += "Контекст соседних слайдов:\n";
    if (context.prevTitle) prompt += `- Предыдущий: "${context.prevTitle}"\n`;
    if (context.nextTitle) prompt += `- Следующий: "${context.nextTitle}"\n`;
    prompt += "\n";
  }

  if (hint) {
    prompt += `Подсказка пользователя: ${hint}\n`;
  }

  prompt += "\nВерни один слайд в формате JSON, сохранив тот же тип.";

  return prompt;
}
