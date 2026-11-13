"use client";

import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  createSlotAction,
  deleteSlotAction,
  reassignSlotAction,
  updateSlotAction,
  type ActionResult,
} from "@/lib/actions/schedule";
import {
  SPECIALTY_CHIP,
  SPECIALTY_LABELS,
  SPECIALTY_SHORT,
  WEEKDAY_LABELS,
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

function SlotDetail({
  slot,
  activeChildren,
  weekdays,
  readOnly,
  mode,
  setMode,
  onClose,
  reassignAction,
  reassignPending,
  reassignState,
  updateAction,
  updatePending,
  updateState,
  onLiberate,
  liberating,
}: {
  slot: Slot;
  activeChildren: Child[];
  weekdays: number[];
  readOnly: boolean;
  mode: "view" | "edit";
  setMode: (mode: "view" | "edit") => void;
  onClose?: () => void;
  reassignAction: (payload: FormData) => void;
  reassignPending: boolean;
  reassignState: ActionResult | null;
  updateAction: (payload: FormData) => void;
  updatePending: boolean;
  updateState: ActionResult | null;
  onLiberate: () => void;
  liberating: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {WEEKDAY_LABELS[slot.weekday]} · Semana {slot.weekCycle}
          </p>
          <h2 className="text-lg font-semibold leading-tight">{slot.childName}</h2>
          <p className="text-sm text-muted">
            {slot.time} · {SPECIALTY_LABELS[slot.specialty]}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            className="btn btn-secondary px-2 py-1 text-sm"
            onClick={onClose}
          >
            Cerrar
          </button>
        ) : null}
      </div>

      {readOnly ? (
        <p className="rounded-xl border border-border bg-[#f7fbfa] px-3 py-2 text-sm text-muted">
          Solo consulta. Este rol no puede modificar la agenda.
        </p>
      ) : mode === "edit" ? (
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
                {weekdays.map((d) => (
                  <option key={d} value={d}>
                    {WEEKDAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Hora</label>
              <input
                name="time"
                type="time"
                defaultValue={slot.time}
                required
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updatePending}
            >
              Guardar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMode("view")}
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
          <form action={reassignAction} className="space-y-2">
            <input type="hidden" name="slotId" value={slot.id} />
            <div className="field">
              <label>Reasignar a</label>
              <select name="childId" defaultValue={slot.childId}>
                {activeChildren.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-secondary w-full"
              disabled={reassignPending}
            >
              {reassignPending ? "Reasignando..." : "Reasignar"}
            </button>
            {reassignState && !reassignState.ok ? (
              <p className="text-sm text-rose-700">{reassignState.error}</p>
            ) : null}
          </form>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <button
              type="button"
              className="btn btn-secondary w-full"
              onClick={() => setMode("edit")}
            >
              Editar horario
            </button>
            <button
              type="button"
              className="btn btn-danger w-full"
              disabled={liberating}
              onClick={onLiberate}
            >
              Liberar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AgendaBoard({
  slots,
  childrenList,
  initialCycle,
  activeWeekdays,
  readOnly = false,
}: {
  slots: Slot[];
  childrenList: Child[];
  initialCycle: WeekCycle;
  activeWeekdays: number[];
  readOnly?: boolean;
}) {
  const [cycle, setCycle] = useState<WeekCycle>(initialCycle);
  const [specialty, setSpecialty] = useState<Specialty | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");

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

  const grouped = useMemo(
    () =>
      activeWeekdays.map((day) => ({
        day,
        items: filtered
          .filter((s) => s.weekday === day)
          .sort((a, b) =>
            a.time === b.time
              ? a.childName.localeCompare(b.childName)
              : a.time.localeCompare(b.time),
          ),
      })),
    [filtered, activeWeekdays],
  );

  const selected = filtered.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !filtered.some((s) => s.id === selectedId)) {
      setSelectedId(null);
      setMode("view");
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (createState?.ok) setShowCreate(false);
  }, [createState]);

  useEffect(() => {
    if (updateState?.ok || reassignState?.ok) setMode("view");
  }, [updateState, reassignState]);

  function selectSlot(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
    setMode("view");
  }

  function liberateSelected() {
    if (!selected) return;
    startTransition(async () => {
      await deleteSlotAction(selected.id);
      setSelectedId(null);
      setMode("view");
      router.refresh();
    });
  }

  const detailProps = selected
    ? {
        slot: selected,
        activeChildren,
        weekdays: activeWeekdays,
        readOnly,
        mode,
        setMode,
        reassignAction,
        reassignPending,
        reassignState,
        updateAction,
        updatePending,
        updateState,
        onLiberate: liberateSelected,
        liberating: pending,
      }
    : null;

  return (
    <div className="space-y-3">
      <div className="sticky top-[4.5rem] z-10 space-y-2 rounded-2xl border border-border bg-[rgba(243,247,246,0.94)] p-2 backdrop-blur sm:top-[5.25rem] sm:p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
            {(["A", "B"] as WeekCycle[]).map((value) => (
              <button
                key={value}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  cycle === value
                    ? "bg-primary text-white"
                    : "text-muted hover:text-foreground"
                }`}
                onClick={() => {
                  setCycle(value);
                  setSelectedId(null);
                  setMode("view");
                }}
              >
                Semana {value}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className={`rounded-lg px-2.5 py-1.5 text-sm font-semibold transition ${
                specialty === "all"
                  ? "bg-primary text-white"
                  : "bg-white text-muted hover:text-foreground"
              }`}
              onClick={() => setSpecialty("all")}
            >
              Todas
            </button>
            {specialties.map((spec) => (
              <button
                key={spec}
                type="button"
                className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition ${
                  specialty === spec
                    ? "border-primary bg-primary text-white"
                    : `${SPECIALTY_CHIP[spec]} hover:opacity-90`
                }`}
                onClick={() => setSpecialty(spec)}
                title={SPECIALTY_LABELS[spec]}
              >
                {SPECIALTY_SHORT[spec]}
              </button>
            ))}
          </div>

          <p className="ml-auto text-sm text-muted">{filtered.length} cita(s)</p>

          {!readOnly ? (
            <button
              type="button"
              className="btn btn-primary py-2 text-sm"
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate ? "Cerrar" : "Agregar horario"}
            </button>
          ) : null}
        </div>

        {!readOnly && showCreate ? (
          <form
            action={createAction}
            className="grid gap-2 rounded-xl border border-border bg-white p-3 sm:grid-cols-2 lg:grid-cols-6"
          >
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
              <select
                id="specialty"
                name="specialty"
                required
                defaultValue="fisica"
              >
                {specialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {SPECIALTY_LABELS[spec]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="weekday">Día</label>
              <select
                id="weekday"
                name="weekday"
                required
                defaultValue={String(activeWeekdays[0] ?? 1)}
              >
                {activeWeekdays.map((day) => (
                  <option key={day} value={day}>
                    {WEEKDAY_LABELS[day]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="time">Hora</label>
              <input
                id="time"
                name="time"
                type="time"
                required
                defaultValue="08:00"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={createPending}
              >
                {createPending ? "Guardando..." : "Agregar"}
              </button>
            </div>
            {createState && !createState.ok ? (
              <p className="text-sm text-rose-700 sm:col-span-2 lg:col-span-6">
                {createState.error}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start">
        <div className="overflow-x-auto pb-1">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.max(activeWeekdays.length, 1)}, minmax(11.5rem, 1fr))`,
              minWidth: `${Math.max(activeWeekdays.length, 1) * 12}rem`,
            }}
          >
            {grouped.map(({ day, items }) => (
              <section
                key={day}
                className="overflow-hidden rounded-xl border border-border bg-white"
              >
                <div className="border-b border-border bg-[#f7fbfa] px-2.5 py-2">
                  <h3 className="text-sm font-semibold leading-tight">
                    {WEEKDAY_LABELS[day]}
                  </h3>
                  <p className="text-xs text-muted">{items.length}</p>
                </div>
                <ul className="max-h-[calc(100vh-13.5rem)] space-y-1 overflow-y-auto p-1.5">
                  {items.length === 0 ? (
                    <li className="px-2 py-6 text-center text-xs text-muted">
                      Sin citas
                    </li>
                  ) : (
                    items.map((slot) => {
                      const active = selectedId === slot.id;
                      return (
                        <li key={slot.id}>
                          <button
                            type="button"
                            onClick={() => selectSlot(slot.id)}
                            className={`flex w-full items-start gap-1.5 rounded-lg border px-1.5 py-1.5 text-left transition ${
                              active
                                ? "border-ring bg-teal-50 ring-1 ring-ring"
                                : `border-transparent hover:border-border hover:bg-[#f7fbfa] ${SPECIALTY_CHIP[slot.specialty]}`
                            } ${!slot.childActive ? "opacity-60" : ""}`}
                            title={`${slot.time} · ${slot.childName} · ${SPECIALTY_LABELS[slot.specialty]}`}
                          >
                            <span className="w-10 shrink-0 pt-0.5 text-[0.7rem] font-semibold tabular-nums leading-none">
                              {slot.time}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[0.78rem] font-semibold leading-tight">
                                {slot.childName}
                              </span>
                              <span className="mt-0.5 inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wide opacity-80">
                                {SPECIALTY_SHORT[slot.specialty]}
                                {!slot.childActive ? (
                                  <span className="normal-case opacity-70">
                                    · inactivo
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <aside className="card sticky top-[10.5rem] hidden p-4 xl:block">
          {detailProps ? (
            <SlotDetail {...detailProps} />
          ) : (
            <div className="py-8 text-center text-sm text-muted">
              {readOnly
                ? "Selecciona una cita para ver el detalle."
                : "Selecciona una cita en la grilla para reasignar, editar o liberar."}
            </div>
          )}
        </aside>
      </div>

      {detailProps ? (
        <div className="card p-4 xl:hidden">
          <SlotDetail
            {...detailProps}
            onClose={() => {
              setSelectedId(null);
              setMode("view");
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
