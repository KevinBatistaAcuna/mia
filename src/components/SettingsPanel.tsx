"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  createUserAction,
  deleteUserAction,
  updateSettingsAction,
  updateUserAction,
  type ActionResult,
} from "@/lib/actions/settings";
import { ROLE_LABELS, WEEKDAY_LABELS, WEEKDAYS } from "@/lib/constants";
import type { UserRole } from "@/db/schema";

type Settings = {
  foundationName: string;
  cycleStartDate: string;
  activeWeekdays: number[];
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

const initial: ActionResult | null = null;

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function SettingsPanel({
  settings,
  users,
  currentUserId,
}: {
  settings: Settings;
  users: UserRow[];
  currentUserId: string;
}) {
  const [settingsState, settingsAction, settingsPending] = useActionState(
    updateSettingsAction,
    initial,
  );
  const [userState, userAction, userPending] = useActionState(
    createUserAction,
    initial,
  );
  const [editState, editAction, editPending] = useActionState(
    updateUserAction,
    initial,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (userState?.ok) {
      const form = document.getElementById(
        "create-user-form",
      ) as HTMLFormElement | null;
      form?.reset();
    }
  }, [userState]);

  useEffect(() => {
    if (editState?.ok) setEditingId(null);
  }, [editState]);

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-1 text-lg font-semibold">Fundación y ciclo A/B</h2>
        <p className="mb-4 text-sm text-muted">
          La fecha de inicio define qué semana es A. A partir de esa semana se
          alternan A y B.
        </p>
        <form action={settingsAction} className="grid gap-4 sm:grid-cols-2">
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
            <p className="mb-1 text-sm font-semibold text-muted">
              Días de atención
            </p>
            <p className="mb-3 text-sm text-muted">
              Solo estos días aparecen en la agenda. Puedes ampliarlos cuando
              extiendan horarios.
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const checked = settings.activeWeekdays.includes(day);
                return (
                  <label
                    key={day}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold has-[:checked]:border-primary has-[:checked]:bg-[#e7f6f3] has-[:checked]:text-primary"
                  >
                    <input
                      type="checkbox"
                      name="activeWeekdays"
                      value={day}
                      defaultChecked={checked}
                      className="accent-[var(--primary)]"
                    />
                    {WEEKDAY_LABELS[day]}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={settingsPending}
            >
              {settingsPending ? "Guardando..." : "Guardar configuración"}
            </button>
            {settingsState?.ok ? (
              <p className="mt-2 text-sm text-emerald-700">
                Configuración guardada.
              </p>
            ) : null}
            {settingsState && !settingsState.ok ? (
              <p className="mt-2 text-sm text-rose-700">{settingsState.error}</p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">Usuarios</h2>
        {listError ? (
          <p className="mb-3 text-sm text-rose-700">{listError}</p>
        ) : null}
        <ul className="mb-6 divide-y divide-border rounded-xl border border-border">
          {users.map((user) => {
            const editing = editingId === user.id;
            const isSelf = user.id === currentUserId;

            return (
              <li key={user.id} className="px-4 py-3">
                {editing ? (
                  <form action={editAction} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={user.id} />
                    <div className="field">
                      <label>Nombre</label>
                      <input name="name" required defaultValue={user.name} />
                    </div>
                    <div className="field">
                      <label>Correo</label>
                      <input
                        name="email"
                        type="email"
                        required
                        defaultValue={user.email}
                      />
                    </div>
                    <div className="field">
                      <label>Nueva contraseña (opcional)</label>
                      <input
                        name="password"
                        type="password"
                        minLength={6}
                        placeholder="Dejar vacío para no cambiar"
                      />
                    </div>
                    <div className="field">
                      <label>Rol</label>
                      <select name="role" defaultValue={user.role}>
                        <option value="assistant">Asistente</option>
                        <option value="therapist">Terapeuta</option>
                        <option value="admin">Administradora</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={editPending}
                      >
                        {editPending ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                    {editState && !editState.ok ? (
                      <p className="text-sm text-rose-700 sm:col-span-2">
                        {editState.error}
                      </p>
                    ) : null}
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{user.name}</p>
                      <p className="truncate text-sm text-muted">{user.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-[#e7f6f3] px-3 py-1 text-xs font-semibold text-primary">
                        {ROLE_LABELS[user.role]}
                      </span>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-foreground hover:bg-[#eef6f4]"
                        title="Editar usuario"
                        aria-label={`Editar ${user.name}`}
                        onClick={() => {
                          setListError(null);
                          setEditingId(user.id);
                        }}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-[#fff1f1] text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
                        title={
                          isSelf
                            ? "No puedes eliminar tu propio usuario"
                            : "Eliminar usuario"
                        }
                        aria-label={`Eliminar ${user.name}`}
                        disabled={isSelf || pending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`,
                            )
                          ) {
                            return;
                          }
                          setListError(null);
                          startTransition(async () => {
                            const result = await deleteUserAction(user.id);
                            if (!result.ok) {
                              setListError(result.error);
                              return;
                            }
                            router.refresh();
                          });
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <h3 className="mb-3 font-semibold">Agregar usuario</h3>
        <form
          id="create-user-form"
          action={userAction}
          className="grid gap-3 sm:grid-cols-2"
        >
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
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
            />
          </div>
          <div className="field">
            <label htmlFor="role">Rol</label>
            <select id="role" name="role" defaultValue="assistant">
              <option value="assistant">Asistente</option>
              <option value="therapist">Terapeuta</option>
              <option value="admin">Administradora</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={userPending}
            >
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
