import { requireCLevel } from "@/lib/auth";
import {
  approveTelegramPending,
  assignProject,
  createUser,
  dismissTelegramPending,
  linkTelegramToUser,
  removeProjectAssignment,
  resetUserPassword,
  toggleUserActive,
  unlinkTelegram,
} from "@/lib/auth-actions";
import { getAdminData } from "@/lib/queries";
import { ROLE_LABELS, USER_ROLES } from "@/lib/permissions";

export default async function AdminPage() {
  await requireCLevel();
  const { users, projects, pendingTelegram } = await getAdminData();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Админка доступов</h2>
        <p className="text-sm text-slate-500">
          C-level создаёт аккаунты, назначает проекты и выдаёт доступ к Telegram-боту.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Создать пользователя</h3>
        <form action={createUser} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            name="name"
            placeholder="Имя"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder="email@company.com"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="Пароль"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            name="role"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {USER_ROLES.filter((role) => role !== "c_level").map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-atom px-4 py-2 text-sm font-medium text-atom-ink hover:bg-atom-hover md:col-span-2 md:w-fit"
          >
            Создать аккаунт
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
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
                  <p className="font-medium">{displayName}</p>
                  <p className="text-sm text-slate-500">
                    ID: {pending.telegramId}
                    {pending.username ? ` · @${pending.username}` : ""}
                  </p>
                  {pending.lastMessage ? (
                    <p className="mt-1 text-xs text-slate-400">
                      Последнее сообщение: {pending.lastMessage}
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    <form
                      action={approveTelegramPending}
                      className="contents"
                    >
                      <input type="hidden" name="pendingId" value={pending.id} />
                      <input
                        name="name"
                        defaultValue={displayName}
                        placeholder="Имя"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        name="email"
                        type="email"
                        placeholder="email@company.com"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <select
                        name="role"
                        required
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        {USER_ROLES.filter((role) => role !== "c_level").map(
                          (role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ),
                        )}
                      </select>
                      <select
                        name="existingUserId"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Создать нового пользователя</option>
                        {users.map((account) => (
                          <option key={account.id} value={account.id}>
                            Привязать к: {account.name} ({account.email})
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg bg-atom px-3 py-2 text-sm font-medium text-atom-ink hover:bg-atom-hover"
                      >
                        Выдать доступ
                      </button>
                    </form>
                    <form action={dismissTelegramPending}>
                      <input type="hidden" name="pendingId" value={pending.id} />
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
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
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold">{account.name}</p>
                <p className="text-sm text-slate-500">
                  {account.email} ·{" "}
                  {ROLE_LABELS[account.role as keyof typeof ROLE_LABELS]}
                </p>
                <p className="mt-1 text-xs text-slate-400">
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
                className="mt-4 flex flex-wrap items-end gap-2"
              >
                <input type="hidden" name="userId" value={account.id} />
                <input
                  name="telegramId"
                  placeholder="Telegram ID"
                  required
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  name="telegramUsername"
                  placeholder="@username"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
                  className="mt-4 flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="userId" value={account.id} />
                  <select
                    name="projectId"
                    required
                    className="min-w-[240px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
                  className="mt-4 flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="userId" value={account.id} />
                  <input
                    name="password"
                    type="password"
                    placeholder="Новый пароль"
                    required
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
