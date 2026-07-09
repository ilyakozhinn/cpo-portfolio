import { login } from "@/lib/auth-actions";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  getDemoAccountLabel,
} from "@/lib/demo-credentials";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-3 py-6 sm:px-4 sm:py-8">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-atom-ink">
          ATOM Portfolio
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Вход в систему</h1>
        <p className="mt-2 text-sm text-slate-500">
          C-level видит весь портфель. PO, PM и маркетологи заполняют статусы
          только по своим проектам и отделам.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Неверный email или пароль
          </p>
        ) : null}

        <form action={login} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="text-slate-600">Email</span>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2"
              placeholder="cpo@atom.local"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Пароль</span>
            <input
              name="password"
              type="password"
              required
              className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-atom px-4 py-2 text-sm font-medium text-atom-ink hover:bg-atom-hover"
          >
            Войти
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Тестовые аккаунты</p>
          <p className="mt-1 text-xs text-slate-500">
            Пароль для всех ролей:{" "}
            <span className="font-mono font-medium text-slate-700">
              {DEMO_PASSWORD}
            </span>
          </p>
          <div className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <div
                key={account.email}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <span className="font-medium text-slate-800">
                    {getDemoAccountLabel(account.role)}
                  </span>
                  <span className="break-all font-mono text-slate-600">
                    {account.email}
                  </span>
                </div>
                <p className="mt-1 break-words text-slate-500">{account.projects}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
