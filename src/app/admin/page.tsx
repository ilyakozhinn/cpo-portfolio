import { requireCLevel } from "@/lib/auth";
import {
  assignProject,
  createUser,
  dismissTelegramPending,
  linkTelegramToUser,
  removeProjectAssignment,
  resetUserPassword,
  toggleUserActive,
  unlinkTelegram,
} from "@/lib/auth-actions";
import { ApproveTelegramForm } from "@/components/approve-telegram-form";
import { getAdminData } from "@/lib/queries";
import { ROLE_LABELS, USER_ROLES } from "@/lib/permissions";

const SUCCESS_MESSAGES: Record<string, string> = {
  user_created: "Пользователь создан",
  user_activated: "Пользователь разблокирован",
  user_blocked: "Пользователь заблокирован",
  password_reset: "Пароль обновлён",
  project_assigned: "Проект назначен",
  assignment_removed: "Назначение снято",
  telegram_linked: "Telegram привязан",
  telegram_unlinked: "Telegram отвязан",
  access_granted: "Доступ выдан, пользователь создан",
  pending_dismissed: "Заявка отклонена",
};

const ERROR_MESSAGES: Record<string, string> = {
  fill_required: "Заполните все обязательные поля",
  email_taken: "Такой email уже занят",
  missing_user: "Пользователь не найден",
  password_required: "Укажите новый пароль",
  project_required: "Выберите проект",
  missing_assignment: "Назначение не найдено",
  telegram_required: "Укажите Telegram ID",
  telegram_taken: "Этот Telegram уже привязан к другому пользователю",
  telegram_missing: "У пользователя нет привязанного Telegram",
  pending_missing: "Заявка не найдена или уже обработана",
  role_required: "Выберите роль",
  approve_fields: "Для нового пользователя укажите имя, email и роль",
  approve_failed: "Не удалось выдать доступ. Попробуйте ещё раз",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireCLevel();
  const params = await searchParams;
  const { users, projects, pendingTelegram } = await getAdminData();

  const successMessage = params.success
    ? SUCCESS_MESSAGES[params.success] ?? "Готово"
    : null;
  const errorMessage = params.error
    ? ERROR_MESSAGES[params.error] ?? "Ошибка"
    : null;

  const accountOptions = users.map((account) => ({
    id: account.id,
    name: account.name,
    email: account.email,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Админка доступов</h2>
        <p className="text-sm text-slate-500">
          C-level создаёт аккаунты, назначает проекты и выдаёт доступ к Telegram-боту.
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="font-semibold">Создать пользователя</h3>
        <form action={createUser} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            placeholder="Имя"
            required
            className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder="email@company.com"
            required
            className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="Пароль"
            required
            className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            name="role"
            required
            className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {USER_ROLES.filter((role) => role !== "c_level").map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-atom px-4 py-2 text-sm font-medium text-atom-ink hover:bg-atom-hover sm:col-span-2 sm:w-fit"
          >
            Создать аккаунт
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <h3 className="font-semibold text-amber-950">
          Заявки из Telegram ({pendingTelegram.length})
        </h3>
        <p className="mt-1 text-sm text-amber-800">
          Люди написали боту, но ещё без роли. Пока роль не выдана — бот им не отвечает.
        </p>

        {pendingTelegram.length === 0 ? (
          <p className="mt-4 text-sm text-amber-700">Новых заявок нет</p>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingTelegram.map((pending) => {
              const displayName =
                [pending.firstName, pending.lastName].filter(Boolean).join(" ") ||
                pending.username ||
                pending.telegramId;

              return (
                <div
                  key={pending.id}
                  className="rounded-xl border border-amber-200 bg-white p-4"
                >
                  <p className="break-words font-medium">{displayName}</p>
                  <p className="break-all text-sm text-slate-500">
                    ID: {pending.telegramId}
                    {pending.username ? ` · @${pending.username}` : ""}
                  </p>
                  {pending.lastMessage ? (
                    <p className="mt-1 break-words text-xs text-slate-400">
                      Последнее сообщение: {pending.lastMessage}
                    </p>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    <ApproveTelegramForm
                      pendingId={pending.id}
                      displayName={displayName}
                      users={accountOptions}
                    />
                    <form action={dismissTelegramPending}>
                      <input type="hidden" name="pendingId" value={pending.id} />
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 sm:w-auto"
                      >
                        Отклонить
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Пользователи</h3>
        {users.map((account) => (
          <div
            key={account.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold">{account.name}</p>
                <p className="break-all text-sm text-slate-500">
                  {account.email} ·{" "}
                  {ROLE_LABELS[account.role as keyof typeof ROLE_LABELS]}
                </p>
                <p className="mt-1 break-all text-xs text-slate-400">
                  {account.isActive ? "Активен" : "Заблокирован"}
                  {account.telegramId
                    ? ` · Telegram: ${account.telegramId}${
                        account.telegramUsername
                          ? ` (@${account.telegramUsername})`
                          : ""
                      }`
                    : " · Telegram не привязан"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={toggleUserActive}>
                  <input type="hidden" name="userId" value={account.id} />
                  <input
                    type="hidden"
                    name="isActive"
                    value={account.isActive ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    {account.isActive ? "Заблокировать" : "Разблокировать"}
                  </button>
                </form>
                {account.telegramId ? (
                  <form action={unlinkTelegram}>
                    <input type="hidden" name="userId" value={account.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                      Отвязать Telegram
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            {!account.telegramId ? (
              <form
                action={linkTelegramToUser}
                className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
              >
                <input type="hidden" name="userId" value={account.id} />
                <input
                  name="telegramId"
                  placeholder="Telegram ID"
                  required
                  className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  name="telegramUsername"
                  placeholder="@username"
                  className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Привязать Telegram
                </button>
              </form>
            ) : null}

            {account.role !== "c_level" ? (
              <>
                <form
                  action={assignProject}
                  className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"
                >
                  <input type="hidden" name="userId" value={account.id} />
                  <select
                    name="projectId"
                    required
                    className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Назначить проект</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.businessUnit.name})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Добавить
                  </button>
                </form>

                <div className="mt-3 flex flex-wrap gap-2">
                  {account.assignments.map((assignment) => (
                    <form key={assignment.id} action={removeProjectAssignment}>
                      <input
                        type="hidden"
                        name="assignmentId"
                        value={assignment.id}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs hover:bg-slate-100"
                      >
                        {assignment.project.name} ×
                      </button>
                    </form>
                  ))}
                </div>

                <form
                  action={resetUserPassword}
                  className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"
                >
                  <input type="hidden" name="userId" value={account.id} />
                  <input
                    name="password"
                    type="password"
                    placeholder="Новый пароль"
                    required
                    className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Сбросить пароль
                  </button>
                </form>
              </>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
