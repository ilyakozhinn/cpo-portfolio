"use client";

import { useState } from "react";
import { approveTelegramPending } from "@/lib/auth-actions";
import { ROLE_LABELS, USER_ROLES } from "@/lib/permissions";

type AccountOption = {
  id: string;
  name: string;
  email: string;
};

export function ApproveTelegramForm({
  pendingId,
  displayName,
  users,
}: {
  pendingId: string;
  displayName: string;
  users: AccountOption[];
}) {
  const [existingUserId, setExistingUserId] = useState("");
  const linkingExisting = existingUserId.length > 0;

  return (
    <form
      action={approveTelegramPending}
      className="grid gap-2 sm:grid-cols-2"
    >
      <input type="hidden" name="pendingId" value={pendingId} />
      <input
        name="name"
        defaultValue={displayName}
        placeholder="Имя"
        required={!linkingExisting}
        disabled={linkingExisting}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
      />
      <input
        name="email"
        type="email"
        placeholder="email@company.com"
        required={!linkingExisting}
        disabled={linkingExisting}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
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
      <select
        name="existingUserId"
        value={existingUserId}
        onChange={(event) => setExistingUserId(event.target.value)}
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
        className="rounded-lg bg-atom px-3 py-2 text-sm font-medium text-atom-ink hover:bg-atom-hover sm:col-span-2 sm:w-fit"
      >
        Выдать доступ
      </button>
    </form>
  );
}
