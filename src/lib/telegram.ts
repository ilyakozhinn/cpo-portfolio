import { prisma } from "@/lib/prisma";
import {
  generatePreviousTasksFollowUp,
  refreshProjectAiSummary,
} from "@/lib/deepseek";
import {
  DEPARTMENT_LABELS,
  ROLE_LABELS,
  roleToDepartment,
  type Department,
  type UserRole,
} from "@/lib/permissions";
import { getCurrentWeekStart } from "@/lib/queries";
import { formatWeekLabel, shiftWeek } from "@/lib/week";

const TELEGRAM_API = "https://api.telegram.org";

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: { id: number };
  from?: TelegramUser;
};

type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from: TelegramUser;
  message?: TelegramMessage;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

type SessionDraft = {
  step: string;
  userId?: string | null;
  projectId?: string | null;
  weekStart?: string | null;
  draftRag?: string | null;
  draftProgress?: string | null;
  draftTasks?: string | null;
  draftRisks?: string | null;
  draftBlockers?: string | null;
  draftAskToCpo?: string | null;
  draftMilestone?: string | null;
  draftPreviousCheck?: string | null;
  followUpQuestion?: string | null;
};

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return token;
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: InlineKeyboard,
) {
  const response = await fetch(`${TELEGRAM_API}/bot${botToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Telegram sendMessage failed", body);
  }
}

async function answerCallbackQuery(callbackQueryId: string) {
  await fetch(`${TELEGRAM_API}/bot${botToken()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
}

async function getOrCreateSession(telegramId: string) {
  return prisma.telegramSession.upsert({
    where: { telegramId },
    update: {},
    create: { telegramId, step: "idle" },
  });
}

async function updateSession(telegramId: string, data: Partial<SessionDraft>) {
  return prisma.telegramSession.update({
    where: { telegramId },
    data,
  });
}

async function resetSession(telegramId: string, userId?: string | null) {
  return updateSession(telegramId, {
    step: "idle",
    projectId: null,
    weekStart: null,
    draftRag: null,
    draftProgress: null,
    draftTasks: null,
    draftRisks: null,
    draftBlockers: null,
    draftAskToCpo: null,
    draftMilestone: null,
    draftPreviousCheck: null,
    followUpQuestion: null,
    ...(userId !== undefined ? { userId } : {}),
  });
}

async function findAuthorizedUser(telegramId: string) {
  return prisma.user.findFirst({
    where: {
      telegramId,
      isActive: true,
      role: { in: ["po", "pm", "marketer"] },
    },
    include: {
      assignments: {
        include: { project: true },
      },
    },
  });
}

async function upsertPendingUser(
  from: TelegramUser,
  lastMessage?: string,
) {
  const telegramId = String(from.id);
  await prisma.telegramPendingUser.upsert({
    where: { telegramId },
    update: {
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      lastMessage: lastMessage ?? null,
    },
    create: {
      telegramId,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      lastMessage: lastMessage ?? null,
    },
  });
}

function departmentForUser(role: UserRole): Department | null {
  return roleToDepartment(role);
}

async function getAssignedProjects(userId: string, _role: UserRole) {
  const assignments = await prisma.projectAssignment.findMany({
    where: {
      userId,
      project: { lifecycle: "active" },
    },
    include: { project: true },
    orderBy: { project: { priority: "asc" } },
  });

  return assignments.map((item) => item.project);
}

function projectKeyboard(
  projects: Array<{ id: string; name: string }>,
): InlineKeyboard {
  return {
    inline_keyboard: projects.map((project) => [
      {
        text: project.name,
        callback_data: `project:${project.id}`,
      },
    ]),
  };
}

function ragKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "🟢 Зелёный", callback_data: "rag:green" },
        { text: "🟡 Жёлтый", callback_data: "rag:yellow" },
        { text: "🔴 Красный", callback_data: "rag:red" },
      ],
    ],
  };
}

function skipKeyboard(step: string): InlineKeyboard {
  return {
    inline_keyboard: [[{ text: "Пропустить", callback_data: `skip:${step}` }]],
  };
}

async function startStatusFunnel(
  chatId: number,
  telegramId: string,
  user: NonNullable<Awaited<ReturnType<typeof findAuthorizedUser>>>,
) {
  const projects = await getAssignedProjects(user.id, user.role as UserRole);
  if (projects.length === 0) {
    await sendTelegramMessage(
      chatId,
      "Вам пока не назначены проекты. Попросите C-level выдать доступ в админке.",
    );
    return;
  }

  const weekStart = await getCurrentWeekStart();
  await updateSession(telegramId, {
    step: "choose_project",
    userId: user.id,
    weekStart,
    projectId: null,
    draftRag: null,
    draftProgress: null,
    draftTasks: null,
    draftRisks: null,
    draftBlockers: null,
    draftAskToCpo: null,
    draftMilestone: null,
    draftPreviousCheck: null,
    followUpQuestion: null,
  });

  const department = departmentForUser(user.role as UserRole);
  const departmentLabel = department
    ? DEPARTMENT_LABELS[department]
    : "все отделы";

  await sendTelegramMessage(
    chatId,
    [
      `<b>Еженедельный статус</b>`,
      `${formatWeekLabel(weekStart)}`,
      `Роль: ${ROLE_LABELS[user.role as UserRole]} · ${departmentLabel}`,
      ``,
      `<b>Шаг 1/8.</b> Выберите проект:`,
    ].join("\n"),
    projectKeyboard(projects),
  );
}

async function askNextStep(
  chatId: number,
  step: string,
  extras?: { projectName?: string; followUpQuestion?: string | null },
) {
  const prompts: Record<string, string> = {
    previous_tasks: `<b>Шаг 2/8.</b> ${
      extras?.followUpQuestion?.trim() ||
      `Выполнены ли задачи прошлой недели по проекту${
        extras?.projectName ? ` «${extras.projectName}»` : ""
      }?`
    }`,
    rag: `<b>Шаг 3/8.</b> Выберите RAG-статус проекта${extras?.projectName ? ` «${extras.projectName}»` : ""}:`,
    progress: `<b>Шаг 4/8.</b> Что сделано / прогресс за неделю?`,
    tasks: `<b>Шаг 5/8.</b> Какие задачи на следующую неделю?`,
    risks: `<b>Шаг 6/8.</b> Какие риски?`,
    blockers: `<b>Шаг 7/8.</b> Какие блокеры?`,
    ask: `<b>Шаг 8/8.</b> Ask к CPO (или нажмите «Пропустить»):`,
    milestone: `<b>Финал.</b> Следующий milestone (или «Пропустить»):`,
  };

  if (step === "rag") {
    await sendTelegramMessage(chatId, prompts.rag, ragKeyboard());
    return;
  }

  if (
    step === "ask" ||
    step === "milestone" ||
    step === "risks" ||
    step === "blockers" ||
    step === "previous_tasks"
  ) {
    await sendTelegramMessage(chatId, prompts[step], skipKeyboard(step));
    return;
  }

  await sendTelegramMessage(chatId, prompts[step] ?? "Продолжаем.");
}

async function beginAfterProjectSelected(
  chatId: number,
  telegramId: string,
  user: NonNullable<Awaited<ReturnType<typeof findAuthorizedUser>>>,
  projectId: string,
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    await sendTelegramMessage(chatId, "Проект не найден. Напишите /status.");
    return;
  }

  const department = departmentForUser(user.role as UserRole);
  if (!department) {
    await sendTelegramMessage(chatId, "Для вашей роли отдел не определён.");
    return;
  }

  const session = await prisma.telegramSession.findUnique({
    where: { telegramId },
  });
  const weekStart = session?.weekStart ?? (await getCurrentWeekStart());
  const previousWeek = shiftWeek(weekStart, -1);

  const previousStatus = await prisma.weeklyStatus.findUnique({
    where: {
      projectId_weekStart_department: {
        projectId,
        weekStart: previousWeek,
        department,
      },
    },
  });

  const hasPreviousPlan = Boolean(
    previousStatus?.tasks?.trim() ||
      previousStatus?.progress?.trim() ||
      previousStatus?.nextMilestone?.trim(),
  );

  if (hasPreviousPlan) {
    const followUp =
      (await generatePreviousTasksFollowUp({
        projectName: project.name,
        departmentLabel: DEPARTMENT_LABELS[department],
        previousTasks: previousStatus?.tasks,
        previousProgress: previousStatus?.progress,
        previousMilestone: previousStatus?.nextMilestone,
      })) ??
      `Выполнены ли задачи прошлой недели по проекту «${project.name}»?`;

    await updateSession(telegramId, {
      projectId,
      step: "previous_tasks",
      followUpQuestion: followUp,
      draftPreviousCheck: null,
    });
    await askNextStep(chatId, "previous_tasks", {
      projectName: project.name,
      followUpQuestion: followUp,
    });
    return;
  }

  await updateSession(telegramId, {
    projectId,
    step: "rag",
    followUpQuestion: null,
    draftPreviousCheck: null,
  });
  await askNextStep(chatId, "rag", { projectName: project.name });
}

async function saveStatusFromSession(
  telegramId: string,
  user: NonNullable<Awaited<ReturnType<typeof findAuthorizedUser>>>,
) {
  const session = await prisma.telegramSession.findUnique({
    where: { telegramId },
  });
  if (!session?.projectId || !session.weekStart || !session.draftRag) {
    throw new Error("Incomplete session");
  }

  const department = departmentForUser(user.role as UserRole);

  if (!department) {
    throw new Error("No department for role");
  }

  await prisma.weeklyStatus.upsert({
    where: {
      projectId_weekStart_department: {
        projectId: session.projectId,
        weekStart: session.weekStart,
        department,
      },
    },
    update: {
      rag: session.draftRag,
      progress: session.draftProgress,
      tasks: session.draftTasks,
      risks: session.draftRisks,
      blockers: session.draftBlockers,
      askToCpo: session.draftAskToCpo,
      nextMilestone: session.draftMilestone,
      authorId: user.id,
    },
    create: {
      projectId: session.projectId,
      weekStart: session.weekStart,
      department,
      rag: session.draftRag,
      progress: session.draftProgress,
      tasks: session.draftTasks,
      risks: session.draftRisks,
      blockers: session.draftBlockers,
      askToCpo: session.draftAskToCpo,
      nextMilestone: session.draftMilestone,
      authorId: user.id,
    },
  });

  try {
    await refreshProjectAiSummary(session.projectId, session.weekStart);
  } catch (error) {
    console.error("AI summary refresh failed", error);
  }

  const project = await prisma.project.findUnique({
    where: { id: session.projectId },
  });

  return project?.name ?? "проект";
}

async function handleUnauthorized(
  chatId: number,
  from: TelegramUser,
  text?: string,
) {
  await upsertPendingUser(from, text);
  // Silent for unauthorized: no reply, as requested.
  // Still store pending so C-level can grant access.
  void chatId;
}

async function handleAuthorizedText(
  chatId: number,
  telegramId: string,
  text: string,
  user: NonNullable<Awaited<ReturnType<typeof findAuthorizedUser>>>,
) {
  const session = await getOrCreateSession(telegramId);
  const normalized = text.trim();
  const lower = normalized.toLowerCase();

  if (lower === "/start" || lower === "/status" || lower === "статус") {
    await startStatusFunnel(chatId, telegramId, user);
    return;
  }

  if (lower === "/cancel" || lower === "отмена") {
    await resetSession(telegramId, user.id);
    await sendTelegramMessage(chatId, "Воронка отменена. Напишите /status чтобы начать заново.");
    return;
  }

  if (lower === "/help" || lower === "помощь") {
    await sendTelegramMessage(
      chatId,
      [
        `<b>Команды</b>`,
        `/status — заполнить еженедельный статус`,
        `/cancel — отменить текущую воронку`,
        `/help — помощь`,
      ].join("\n"),
    );
    return;
  }

  switch (session.step) {
    case "previous_tasks":
      await updateSession(telegramId, {
        draftPreviousCheck: normalized,
        step: "rag",
      });
      await askNextStep(chatId, "rag");
      return;
    case "progress":
      await updateSession(telegramId, {
        draftProgress: normalized,
        step: "tasks",
      });
      await askNextStep(chatId, "tasks");
      return;
    case "tasks":
      await updateSession(telegramId, {
        draftTasks: normalized,
        step: "risks",
      });
      await askNextStep(chatId, "risks");
      return;
    case "risks":
      await updateSession(telegramId, {
        draftRisks: normalized,
        step: "blockers",
      });
      await askNextStep(chatId, "blockers");
      return;
    case "blockers":
      await updateSession(telegramId, {
        draftBlockers: normalized,
        step: "ask",
      });
      await askNextStep(chatId, "ask");
      return;
    case "ask":
      await updateSession(telegramId, {
        draftAskToCpo: normalized,
        step: "milestone",
      });
      await askNextStep(chatId, "milestone");
      return;
    case "milestone": {
      const previousNote = session.draftPreviousCheck?.trim();
      if (previousNote) {
        await updateSession(telegramId, {
          draftProgress: [
            `Проверка прошлых задач: ${previousNote}`,
            session.draftProgress ?? "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          draftMilestone: normalized,
          step: "saving",
        });
      } else {
        await updateSession(telegramId, {
          draftMilestone: normalized,
          step: "saving",
        });
      }
      const projectName = await saveStatusFromSession(telegramId, user);
      await resetSession(telegramId, user.id);
      await sendTelegramMessage(
        chatId,
        `✅ Статус по проекту <b>${projectName}</b> сохранён.\nНапишите /status, чтобы заполнить следующий.`,
      );
      return;
    }
    case "choose_project":
    case "rag":
      await sendTelegramMessage(
        chatId,
        "Выберите вариант кнопкой ниже или напишите /cancel.",
      );
      return;
    default:
      await sendTelegramMessage(
        chatId,
        "Напишите /status, чтобы заполнить еженедельный статус по проекту.",
      );
  }
}

async function handleCallback(
  callback: TelegramCallbackQuery,
  user: NonNullable<Awaited<ReturnType<typeof findAuthorizedUser>>>,
) {
  const chatId = callback.message?.chat.id;
  if (!chatId) return;

  const telegramId = String(callback.from.id);
  const data = callback.data ?? "";
  await answerCallbackQuery(callback.id);

  if (data.startsWith("project:")) {
    const projectId = data.slice("project:".length);
    await beginAfterProjectSelected(chatId, telegramId, user, projectId);
    return;
  }

  if (data.startsWith("rag:")) {
    const rag = data.slice("rag:".length);
    await updateSession(telegramId, {
      draftRag: rag,
      step: "progress",
    });
    await askNextStep(chatId, "progress");
    return;
  }

  if (data.startsWith("skip:")) {
    const step = data.slice("skip:".length);
    if (step === "previous_tasks") {
      await updateSession(telegramId, {
        draftPreviousCheck: null,
        step: "rag",
      });
      await askNextStep(chatId, "rag");
      return;
    }
    if (step === "risks") {
      await updateSession(telegramId, { draftRisks: null, step: "blockers" });
      await askNextStep(chatId, "blockers");
      return;
    }
    if (step === "blockers") {
      await updateSession(telegramId, { draftBlockers: null, step: "ask" });
      await askNextStep(chatId, "ask");
      return;
    }
    if (step === "ask") {
      await updateSession(telegramId, { draftAskToCpo: null, step: "milestone" });
      await askNextStep(chatId, "milestone");
      return;
    }
    if (step === "milestone") {
      const session = await prisma.telegramSession.findUnique({
        where: { telegramId },
      });
      const previousNote = session?.draftPreviousCheck?.trim();
      if (previousNote) {
        await updateSession(telegramId, {
          draftProgress: [
            `Проверка прошлых задач: ${previousNote}`,
            session?.draftProgress ?? "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          draftMilestone: null,
          step: "saving",
        });
      } else {
        await updateSession(telegramId, {
          draftMilestone: null,
          step: "saving",
        });
      }
      const projectName = await saveStatusFromSession(telegramId, user);
      await resetSession(telegramId, user.id);
      await sendTelegramMessage(
        chatId,
        `✅ Статус по проекту <b>${projectName}</b> сохранён.\nНапишите /status, чтобы заполнить следующий.`,
      );
    }
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    const from = update.callback_query.from;
    const telegramId = String(from.id);
    const user = await findAuthorizedUser(telegramId);
    if (!user) {
      await upsertPendingUser(from, update.callback_query.data);
      return;
    }
    await getOrCreateSession(telegramId);
    await handleCallback(update.callback_query, user);
    return;
  }

  const message = update.message;
  if (!message?.from || !message.text) return;

  const from = message.from;
  const telegramId = String(from.id);
  const chatId = message.chat.id;
  const user = await findAuthorizedUser(telegramId);

  if (!user) {
    await handleUnauthorized(chatId, from, message.text);
    return;
  }

  await getOrCreateSession(telegramId);
  await handleAuthorizedText(chatId, telegramId, message.text, user);
}
