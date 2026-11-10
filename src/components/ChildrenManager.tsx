"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  createChildAction,
  toggleChildActiveAction,
  updateChildAction,
  type ActionResult,
} from "@/lib/actions/children";

type Child = {
  id: string;
  name: string;
  active: boolean;
};

const initial: ActionResult | null = null;

export function ChildrenManager({ childrenList }: { childrenList: Child[] }) {
  const [createState, createAction, createPending] = useActionState(
    createChildAction,
    initial,
  );
  const [editState, editAction, editPending] = useActionState(
    updateChildAction,
    initial,
  );
  const [editing, setEditing] = useState<Child | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (createState?.ok) {
      const form = document.getElementById("create-child-form") as HTMLFormElement | null;
      form?.reset();
    }
  }, [createState]);

  useEffect(() => {
    if (editState?.ok) setEditing(null);
  }, [editState]);

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">Agregar niño</h2>
        <form id="create-child-form" action={createAction} className="flex flex-col gap-3 sm:flex-row">
          <div className="field flex-1">
            <label htmlFor="name">Nombre completo</label>
            <input id="name" name="name" required placeholder="Kevin Batista" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={createPending}>
              {createPending ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </form>
        {createState && !createState.ok ? (
          <p className="mt-3 text-sm text-rose-700">{createState.error}</p>
        ) : null}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Listado</h2>
          <p className="text-sm text-muted">
            Los inactivos no aparecen en agenda ni asistencia.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {childrenList.length === 0 ? (
            <li className="px-5 py-8 text-center text-muted">
              Aún no hay niños registrados.
            </li>
          ) : (
            childrenList.map((child) => (
              <li key={child.id} className="px-5 py-4">
                {editing?.id === child.id ? (
                  <form action={editAction} className="space-y-3">
                    <input type="hidden" name="id" value={child.id} />
                    <div className="field">
                      <label htmlFor={`edit-${child.id}`}>Nombre</label>
                      <input
                        id={`edit-${child.id}`}
                        name="name"
                        defaultValue={child.name}
                        required
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={child.active}
                      />
                      Activo
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" className="btn btn-primary" disabled={editPending}>
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setEditing(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                    {editState && !editState.ok ? (
                      <p className="text-sm text-rose-700">{editState.error}</p>
                    ) : null}
                  </form>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{child.name}</p>
                      <p className="text-sm text-muted">
                        {child.active ? "Activo" : "Inactivo"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setEditing(child)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          startTransition(async () => {
                            await toggleChildActiveAction(child.id, !child.active);
                            router.refresh();
                          })
                        }
                      >
                        {child.active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
