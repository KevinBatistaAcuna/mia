"use client";

import { useActionState, useEffect } from "react";
import {
  createUserAction,
  updateSettingsAction,
  type ActionResult,
} from "@/lib/actions/settings";

type Settings = {
  foundationName: string;
  cycleStartDate: string;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "assistant";
};

const initial: ActionResult | null = null;

export function SettingsPanel({
  settings,
  users,
}: {
  settings: Settings;
  users: UserRow[];
}) {
  const [settingsState, settingsAction, settingsPending] = useActionState(
    updateSettingsAction,
    initial,
  );
  const [userState, userAction, userPending] = useActionState(
    createUserAction,
    initial,
  );

  useEffect(() => {
    if (userState?.ok) {
      const form = document.getElementById("create-user-form") as HTMLFormElement | null;
      form?.reset();
    }
  }, [userState]);

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-1 text-lg font-semibold">Fundación y ciclo A/B</h2>
        <p className="mb-4 text-sm text-muted">
          La fecha de inicio define qué semana es A. A partir de esa semana se
          alternan A y B.
        </p>
        <form action={settingsAction} className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="foundationName">Nombre</label>
            <input
              id="foundationName"
              name="foundationName"
              required
              defaultValue={settings.foundationName}
            />
          </div>
          <div className="field">
            <label htmlFor="cycleStartDate">Inicio del ciclo (semana A)</label>
            <input
              id="cycleStartDate"
              name="cycleStartDate"
              type="date"
              required
              defaultValue={settings.cycleStartDate}
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={settingsPending}>
              {settingsPending ? "Guardando..." : "Guardar configuración"}
            </button>
            {settingsState?.ok ? (
              <p className="mt-2 text-sm text-emerald-700">Configuración guardada.</p>
            ) : null}
            {settingsState && !settingsState.ok ? (
              <p className="mt-2 text-sm text-rose-700">{settingsState.error}</p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">Usuarios</h2>
        <ul className="mb-6 divide-y divide-border rounded-xl border border-border">
          {users.map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-muted">{user.email}</p>
              </div>
              <span className="rounded-full bg-[#e7f6f3] px-3 py-1 text-xs font-semibold text-primary">
                {user.role === "admin" ? "Administradora" : "Asistente"}
              </span>
            </li>
          ))}
        </ul>

        <h3 className="mb-3 font-semibold">Agregar usuario</h3>
        <form id="create-user-form" action={userAction} className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="name">Nombre</label>
            <input id="name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" required minLength={6} />
          </div>
          <div className="field">
            <label htmlFor="role">Rol</label>
            <select id="role" name="role" defaultValue="assistant">
              <option value="assistant">Asistente</option>
              <option value="admin">Administradora</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={userPending}>
              {userPending ? "Creando..." : "Crear usuario"}
            </button>
            {userState?.ok ? (
              <p className="mt-2 text-sm text-emerald-700">Usuario creado.</p>
            ) : null}
            {userState && !userState.ok ? (
              <p className="mt-2 text-sm text-rose-700">{userState.error}</p>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
