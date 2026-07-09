import { prisma } from "@/lib/prisma";
import { DEPARTMENT_LABELS, type Department } from "@/lib/permissions";
import { shiftWeek } from "@/lib/week";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

export type AiRag = "green" | "yellow" | "red";

type StatusLike = {
  department: string;
  rag: string;
  progress?: string | null;
  tasks?: string | null;
  risks?: string | null;
  blockers?: string | null;
  askToCpo?: string | null;
  nextMilestone?: string | null;
  author?: { name: string } | null;
};

type SummaryResult = {
  summary: string;
  aiRag: AiRag;
  previousTasksCheck: string | null;
};

function apiKey() {
  return process.env.DEEPSEEK_API_KEY ?? "";
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeRag(value: unknown): AiRag {
  const rag = String(value ?? "").toLowerCase();
  if (rag === "green" || rag === "yellow" || rag === "red") return rag;
  return "yellow";
}

function formatStatuses(statuses: StatusLike[]) {
  return statuses
    .map((status) => {
      const dept =
        DEPARTMENT_LABELS[status.department as Department] ?? status.department;
      return [
        `Отдел: ${dept}`,
        `Автор: ${status.author?.name ?? "неизвестно"}`,
        `RAG: ${status.rag}`,
        `Прогресс: ${status.progress ?? "—"}`,
        `Задачи: ${status.tasks ?? "—"}`,
        `Риски: ${status.risks ?? "—"}`,
        `Блокеры: ${status.blockers ?? "—"}`,
        `Ask к CPO: ${status.askToCpo ?? "—"}`,
        `Milestone: ${status.nextMilestone ?? "—"}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

async function deepseekChat(
  system: string,
  user: string,
  options?: { json?: boolean },
): Promise<string | null> {
  const key = apiKey();
  if (!key) {
    console.warn("DEEPSEEK_API_KEY is not set");
    return null;
  }

  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(options?.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) {
      console.error("DeepSeek error", await response.text());
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.error("DeepSeek request failed", error);
    return null;
  }
}

function fallbackSummary(statuses: StatusLike[]): SummaryResult {
  const rags = statuses.map((status) => normalizeRag(status.rag));
  const aiRag: AiRag = rags.includes("red")
    ? "red"
    : rags.includes("yellow")
      ? "yellow"
      : statuses.length > 0
        ? "green"
        : "yellow";

  const lines = statuses.map((status) => {
    const dept =
      DEPARTMENT_LABELS[status.department as Department] ?? status.department;
    const progress = status.progress?.trim() || "без деталей";
    return `${dept}: ${progress}`;
  });

  return {
    summary:
      lines.length > 0
        ? lines.join(" · ")
        : "Недостаточно данных для саммари.",
    aiRag,
    previousTasksCheck: null,
  };
}

export async function generateProjectWeeklySummary(input: {
  projectName: string;
  weekStart: string;
  currentStatuses: StatusLike[];
  previousStatuses: StatusLike[];
}): Promise<SummaryResult> {
  if (input.currentStatuses.length === 0) {
    return {
      summary: "Статусы отделов за эту неделю ещё не сданы.",
      aiRag: "yellow",
      previousTasksCheck: null,
    };
  }

  const system = [
    "Ты CPO-аналитик холдинга ATOM.",
    "По ответам отделов (продукт / разработка / маркетинг) сделай краткое саммари для C-level.",
    "Оцени общий RAG проекта: green / yellow / red.",
    "green — план выполняется, критичных проблем нет.",
    "yellow — есть риски/задержки, но проект управляем.",
    "red — серьёзные блокеры, срыв плана или нужна эскалация.",
    "Учти выполнение задач прошлой недели, если они есть.",
    "Ответь строго JSON: {\"summary\":\"...\",\"aiRag\":\"green|yellow|red\",\"previousTasksCheck\":\"...\"}.",
    "summary: 2-4 предложения на русском.",
    "previousTasksCheck: коротко, выполнены ли прошлые задачи; если данных нет — null.",
  ].join(" ");

  const user = [
    `Проект: ${input.projectName}`,
    `Неделя: ${input.weekStart}`,
    ``,
    `Статусы текущей недели:`,
    formatStatuses(input.currentStatuses),
    ``,
    `Статусы прошлой недели (для проверки задач):`,
    input.previousStatuses.length > 0
      ? formatStatuses(input.previousStatuses)
      : "Нет данных",
  ].join("\n");

  const content = await deepseekChat(system, user, { json: true });
  if (!content) return fallbackSummary(input.currentStatuses);

  const parsed = extractJsonObject(content);
  if (!parsed) return fallbackSummary(input.currentStatuses);

  return {
    summary: String(parsed.summary ?? "").trim() || fallbackSummary(input.currentStatuses).summary,
    aiRag: normalizeRag(parsed.aiRag),
    previousTasksCheck:
      parsed.previousTasksCheck == null || parsed.previousTasksCheck === ""
        ? null
        : String(parsed.previousTasksCheck),
  };
}

export async function generatePreviousTasksFollowUp(input: {
  projectName: string;
  departmentLabel: string;
  previousTasks?: string | null;
  previousProgress?: string | null;
  previousMilestone?: string | null;
}): Promise<string | null> {
  const hasContext = Boolean(
    input.previousTasks?.trim() ||
      input.previousProgress?.trim() ||
      input.previousMilestone?.trim(),
  );
  if (!hasContext) return null;

  const system = [
    "Ты ассистент CPO в Telegram-боте ATOM.",
    "Сформулируй один короткий follow-up вопрос на русском:",
    "выполнены ли задачи/планы, которые отдел обозначил на прошлой неделе.",
    "Без вступлений, только сам вопрос.",
  ].join(" ");

  const user = [
    `Проект: ${input.projectName}`,
    `Отдел: ${input.departmentLabel}`,
    `Прошлые задачи: ${input.previousTasks ?? "—"}`,
    `Прошлый прогресс: ${input.previousProgress ?? "—"}`,
    `Прошлый milestone: ${input.previousMilestone ?? "—"}`,
  ].join("\n");

  const content = await deepseekChat(system, user);
  if (content?.trim()) return content.trim().replace(/^["']|["']$/g, "");

  return `Выполнены ли задачи прошлой недели по проекту «${input.projectName}»?`;
}

export async function refreshProjectAiSummary(
  projectId: string,
  weekStart: string,
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) return null;

  const previousWeek = shiftWeek(weekStart, -1);
  const [currentStatuses, previousStatuses] = await Promise.all([
    prisma.weeklyStatus.findMany({
      where: { projectId, weekStart },
      include: { author: true },
    }),
    prisma.weeklyStatus.findMany({
      where: { projectId, weekStart: previousWeek },
      include: { author: true },
    }),
  ]);

  const result = await generateProjectWeeklySummary({
    projectName: project.name,
    weekStart,
    currentStatuses,
    previousStatuses,
  });

  return prisma.projectWeeklySummary.upsert({
    where: {
      projectId_weekStart: { projectId, weekStart },
    },
    update: {
      summary: result.summary,
      aiRag: result.aiRag,
      previousTasksCheck: result.previousTasksCheck,
      rawJson: JSON.stringify(result),
    },
    create: {
      projectId,
      weekStart,
      summary: result.summary,
      aiRag: result.aiRag,
      previousTasksCheck: result.previousTasksCheck,
      rawJson: JSON.stringify(result),
    },
  });
}
