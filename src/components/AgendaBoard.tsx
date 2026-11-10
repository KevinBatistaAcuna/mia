"use client";

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState, useTransition } from "react";
import {
  createSlotAction,
  deleteSlotAction,
  reassignSlotAction,
  updateSlotAction,
  type ActionResult,
} from "@/lib/actions/schedule";
import {
  SPECIALTY_LABELS,
  WEEKDAY_LABELS,
  WEEKDAYS,
} from "@/lib/constants";
import { specialties, type Specialty, type WeekCycle } from "@/db/schema";

type Child = { id: string; name: string; active: boolean };
type Slot = {
  id: string;
  childId: string;
  childName: string;
  childActive: boolean;
  specialty: Specialty;
  weekday: number;
  time: string;
  weekCycle: WeekCycle;
};

const initial: ActionResult | null = null;

export function AgendaBoard({
  slots,
  childrenList,
  initialCycle,
}: {
  slots: Slot[];
  childrenList: Child[];
  initialCycle: WeekCycle;
}) {
  const [cycle, setCycle] = useState<WeekCycle>(initialCycle);
  const [specialty, setSpecialty] = useState<Specialty | "all">("all");
  const [createState, createAction, createPending] = useActionState(
    createSlotAction,
    initial,
  );
  const [reassignState, reassignAction, reassignPending] = useActionState(
    reassignSlotAction,
    initial,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateSlotAction,
    initial,
  );
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeChildren = childrenList.filter((c) => c.active);

  const filtered = useMemo(
    () =>
      slots.filter(
        (s) =>
          s.weekCycle === cycle &&
          (specialty === "all" || s.specialty === specialty),
      ),
    [slots, cycle, specialty],
  );

  const grouped = WEEKDAYS.map((day) => ({
    day,
    items: filtered
      .filter((s) => s.weekday === day)
      .sort((a, b) => a.time.localeCompare(b.time)),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(["A", "B"] as WeekCycle[]).map((value) => (
          <button
            key={value}
            type="button"
            className={`btn ${cycle === value ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setCycle(value)}
          >
            Semana {value}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn ${specialty === "all" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setSpecialty("all")}
        >
          Todas
        </button>
        {specialties.map((spec) => (
          <button
            key={spec}
            type="button"
            className={`btn ${specialty === spec ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSpecialty(spec)}
          >
            {SPECIALTY_LABELS[spec]}
          </button>
        ))}
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">Agregar horario</h2>
        <form action={createAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="weekCycle" value={cycle} />
          <div className="field lg:col-span-2">
            <label htmlFor="childId">Niño</label>
            <select id="childId" name="childId" required defaultValue="">
              <option value="" disabled>
                Seleccionar
              </option>
              {activeChildren.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="specialty">Especialidad</label>
            <select id="specialty" name="specialty" required defaultValue="fisica">
              {specialties.map((spec) => (
                <option key={spec} value={spec}>
                  {SPECIALTY_LABELS[spec]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="weekday">Día</label>
            <select id="weekday" name="weekday" required defaultValue="1">
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {WEEKDAY_LABELS[day]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="time">Hora</label>
            <input id="time" name="time" type="time" required defaultValue="08:00" />
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" className="btn btn-primary" disabled={createPending}>
              {createPending ? "Guardando..." : "Agregar a semana " + cycle}
            </button>
            {createState && !createState.ok ? (
              <p className="mt-2 text-sm text-rose-700">{createState.error}</p>
            ) : null}
          </div>
        </form>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {grouped.map(({ day, items }) => (
          <section key={day} className="card overflow-hidden">
            <div className="border-b border-border bg-[#f7fbfa] px-4 py-3">
              <h3 className="font-semibold">{WEEKDAY_LABELS[day]}</h3>
              <p className="text-sm text-muted">{items.length} cita(s)</p>
            </div>
            <ul className="divide-y divide-border">
              {items.length === 0 ? (
                <li className="px-4 py-6 text-sm text-muted">Sin citas.</li>
              ) : (
                items.map((slot) => (
                  <li key={slot.id} className="space-y-3 px-4 py-4">
                    {editingId === slot.id ? (
                      <form action={updateAction} className="grid gap-3">
                        <input type="hidden" name="slotId" value={slot.id} />
                        <div className="field">
                          <label>Niño</label>
                          <select name="childId" defaultValue={slot.childId} required>
                            {activeChildren.map((child) => (
                              <option key={child.id} value={child.id}>
                                {child.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="field">
                            <label>Especialidad</label>
                            <select name="specialty" defaultValue={slot.specialty}>
                              {specialties.map((spec) => (
                                <option key={spec} value={spec}>
                                  {SPECIALTY_LABELS[spec]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label>Semana</label>
                            <select name="weekCycle" defaultValue={slot.weekCycle}>
                              <option value="A">A</option>
                              <option value="B">B</option>
                            </select>
                          </div>
                          <div className="field">
                            <label>Día</label>
                            <select name="weekday" defaultValue={slot.weekday}>
                              {WEEKDAYS.map((d) => (
                                <option key={d} value={d}>
                                  {WEEKDAY_LABELS[d]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label>Hora</label>
                            <input name="time" type="time" defaultValue={slot.time} required />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="submit" className="btn btn-primary" disabled={updatePending}>
                            Guardar cambios
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                        {updateState && !updateState.ok ? (
                          <p className="text-sm text-rose-700">{updateState.error}</p>
                        ) : null}
                      </form>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {slot.time} · {slot.childName}
                            </p>
                            <p className="text-sm text-muted">
                              {SPECIALTY_LABELS[slot.specialty]}
                              {!slot.childActive ? " · niño inactivo" : ""}
                            </p>
                          </div>
                        </div>
                        <form action={reassignAction} className="flex flex-col gap-2 sm:flex-row">
                          <input type="hidden" name="slotId" value={slot.id} />
                          <select
                            name="childId"
                            className="flex-1 rounded-xl border border-border px-3 py-2"
                            defaultValue={slot.childId}
                          >
                            {activeChildren.map((child) => (
                              <option key={child.id} value={child.id}>
                                {child.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="btn btn-secondary"
                            disabled={reassignPending}
                          >
                            Reasignar
                          </button>
                        </form>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setEditingId(slot.id)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                await deleteSlotAction(slot.id);
                                router.refresh();
                              })
                            }
                          >
                            Liberar
                          </button>
                        </div>
                        {reassignState && !reassignState.ok ? (
                          <p className="text-sm text-rose-700">{reassignState.error}</p>
                        ) : null}
                      </>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
