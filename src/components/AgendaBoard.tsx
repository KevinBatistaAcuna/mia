"use client";

import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  createSlotAction,
  deleteSlotAction,
  reassignSlotAction,
  updateSlotAction,
  type ActionResult,
} from "@/lib/actions/schedule";
import { downloadAgendaPdf } from "@/lib/agenda-export";
import {
  CONTRACT_SLOT_CHIP,
  CONTRACT_SLOT_LABELS,
  CONTRACT_SLOT_SHORT,
  specialtyChipForId,
  specialtyLabel,
  WEEKDAY_LABELS,
  type SpecialtyInfo,
} from "@/lib/constants";
import {
  contractSlotKinds,
  type ContractSlotKind,
  type SlotKind,
  type Specialty,
  type WeekCycle,
} from "@/db/schema";

type Child = { id: string; name: string; active: boolean };
type Slot = {
  id: string;
  childId: string | null;
  childName: string;
  childActive: boolean;
  kind: SlotKind;
  specialty: Specialty;
  weekday: number;
  time: string;
  weekCycle: WeekCycle;
};

type AssignmentOption = {
  value: string;
  label: string;
  search: string;
  group: "child" | "contract";
};

const initial: ActionResult | null = null;

function isContractKind(kind: SlotKind): kind is ContractSlotKind {
  return (contractSlotKinds as readonly string[]).includes(kind);
}

function slotChipClass(slot: Slot, catalog: SpecialtyInfo[]) {
  if (isContractKind(slot.kind)) return CONTRACT_SLOT_CHIP[slot.kind];
  return specialtyChipForId(slot.specialty, catalog);
}

function assignmentValueForSlot(slot: Slot) {
  if (slot.kind === "session" && slot.childId) {
    return `session:${slot.childId}`;
  }
  if (isContractKind(slot.kind)) return slot.kind;
  return "";
}

function findOverlapNames(
  slots: Slot[],
  params: {
    assignment: string;
    specialty: string;
    weekday: number;
    time: string;
    weekCycle: WeekCycle;
    excludeSlotId?: string;
  },
) {
  if (!params.assignment.startsWith("session:")) return null;
  const childId = params.assignment.slice("session:".length);
  const overlaps = slots.filter(
    (slot) =>
      slot.kind === "session" &&
      slot.id !== params.excludeSlotId &&
      slot.specialty === params.specialty &&
      slot.weekday === params.weekday &&
      slot.time === params.time &&
      slot.weekCycle === params.weekCycle &&
      Boolean(slot.childId) &&
      slot.childId !== childId,
  );
  if (overlaps.length === 0) return null;
  return [...new Set(overlaps.map((slot) => slot.childName))];
}

function OverlapConfirmDialog({
  names,
  onCancel,
  onConfirm,
}: {
  names: string[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(22,48,43,0.45)]"
        aria-label="Cerrar"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="overlap-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-[0_20px_50px_rgba(22,48,43,0.18)]"
      >
        <h2
          id="overlap-dialog-title"
          className="font-[family-name:var(--font-display)] text-xl text-primary"
        >
          Horario compartido
        </h2>
        <p className="mt-2 text-sm text-muted">
          Ya hay niño(s) agendado(s) a la misma hora en esta especialidad:
        </p>
        <ul className="mt-3 space-y-1 rounded-xl border border-border bg-[#f7fbfa] px-3 py-2 text-sm font-semibold">
          {names.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          ¿Deseas continuar con la sesión grupal?
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

function buildAssignmentOptions(activeChildren: Child[]): AssignmentOption[] {
  const childOptions: AssignmentOption[] = activeChildren.map((child) => ({
    value: `session:${child.id}`,
    label: child.name,
    search: child.name.toLowerCase(),
    group: "child",
  }));

  const contractOptions: AssignmentOption[] = contractSlotKinds.map((kind) => {
    const label = CONTRACT_SLOT_LABELS[kind];
    const short = CONTRACT_SLOT_SHORT[kind];
    const optionLabel = kind === "libre" ? short : `${label} (${short})`;
    return {
      value: kind,
      label: optionLabel,
      search: `${label} ${short} libre`.toLowerCase(),
      group: "contract" as const,
    };
  });

  return [...childOptions, ...contractOptions];
}

function AssignmentPicker({
  id,
  name,
  options,
  defaultValue,
}: {
  id: string;
  name: string;
  options: AssignmentOption[];
  defaultValue?: string;
}) {
  const [query, setQuery] = useState("");
  const [value, setValue] = useState(defaultValue ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.search.includes(q) || option.label.toLowerCase().includes(q),
    );
  }, [options, query]);

  const childrenOpts = filtered.filter((o) => o.group === "child");
  const contractOpts = filtered.filter((o) => o.group === "contract");

  return (
    <div className="space-y-2">
      <div className="field">
        <label htmlFor={`${id}-search`}>Buscar</label>
        <input
          id={`${id}-search`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ej. libre, LB, almuerzo, nombre del niño"
        />
      </div>
      <div className="field">
        <label htmlFor={id}>Asignación</label>
        <select
          id={id}
          name={name}
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
        >
          <option value="" disabled>
            Seleccionar
          </option>
          {childrenOpts.length > 0 ? (
            <optgroup label="Niños">
              {childrenOpts.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          {contractOpts.length > 0 ? (
            <optgroup label="Contrato">
              {contractOpts.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        {filtered.length === 0 ? (
          <p className="mt-1 text-xs text-muted">
            No hay coincidencias para “{query}”.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SlotDetail({
  slot,
  activeChildren,
  assignmentOptions,
  specialtyCatalog,
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
  onOverlapSubmit,
}: {
  slot: Slot;
  activeChildren: Child[];
  assignmentOptions: AssignmentOption[];
  specialtyCatalog: SpecialtyInfo[];
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
  onOverlapSubmit: (
    event: FormEvent<HTMLFormElement>,
    submit: (payload: FormData) => void,
    excludeSlotId?: string,
  ) => void;
}) {
  const isContract = isContractKind(slot.kind);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {WEEKDAY_LABELS[slot.weekday]} · Semana {slot.weekCycle}
          </p>
          <h2 className="text-lg font-semibold leading-tight">{slot.childName}</h2>
          <p className="text-sm text-muted">
            {slot.time} · {specialtyLabel(slot.specialty, specialtyCatalog)}
            {isContract ? " · Contrato" : ""}
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
        <form
          action={updateAction}
          className="grid gap-3"
          onSubmit={(event) => onOverlapSubmit(event, updateAction, slot.id)}
        >
          <input type="hidden" name="slotId" value={slot.id} />
          <AssignmentPicker
            id={`edit-assignment-${slot.id}`}
            name="assignment"
            options={assignmentOptions}
            defaultValue={assignmentValueForSlot(slot)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label>Especialidad</label>
              <select name="specialty" defaultValue={slot.specialty}>
                {specialtyCatalog.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
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
            <div className="field col-span-2">
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
          {!isContract ? (
            <form action={reassignAction} className="space-y-2">
              <input type="hidden" name="slotId" value={slot.id} />
              <div className="field">
                <label>Reasignar a</label>
                <select name="childId" defaultValue={slot.childId ?? ""}>
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
          ) : (
            <p className="rounded-xl border border-border bg-[#f7fbfa] px-3 py-2 text-sm text-muted">
              Bloque de contrato. Puedes editar horario o liberarlo.
            </p>
          )}

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
  specialtyCatalog,
  initialCycle,
  activeWeekdays,
  readOnly = false,
}: {
  slots: Slot[];
  childrenList: Child[];
  specialtyCatalog: SpecialtyInfo[];
  initialCycle: WeekCycle;
  activeWeekdays: number[];
  readOnly?: boolean;
}) {
  const [cycle, setCycle] = useState<WeekCycle>(initialCycle);
  const [specialty, setSpecialty] = useState<Specialty | "all">("all");
  const [childQuery, setChildQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [overlapPending, setOverlapPending] = useState<{
    names: string[];
    formData: FormData;
    submit: (payload: FormData) => void;
  } | null>(null);
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
  const assignmentOptions = useMemo(
    () => buildAssignmentOptions(activeChildren),
    [activeChildren],
  );

  const filtered = useMemo(() => {
    const q = childQuery.trim().toLowerCase();
    return slots.filter((s) => {
      if (s.weekCycle !== cycle) return false;
      if (specialty !== "all" && s.specialty !== specialty) return false;
      if (!q) return true;
      return s.childName.toLowerCase().includes(q);
    });
  }, [slots, cycle, specialty, childQuery]);

  const dayMatrices = useMemo(
    () =>
      activeWeekdays.map((day) => {
        const items = filtered.filter((slot) => slot.weekday === day);
        const times = [
          ...new Set(items.map((slot) => slot.time)),
        ].sort((a, b) => a.localeCompare(b));
        const usedSpecialtyIds = new Set(items.map((slot) => slot.specialty));
        const specialtiesForDay = specialtyCatalog.filter((spec) => {
          if (specialty !== "all" && spec.id !== specialty) return false;
          return usedSpecialtyIds.has(spec.id);
        });
        return { day, items, times, specialtiesForDay };
      }),
    [filtered, activeWeekdays, specialty, specialtyCatalog],
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

  function handleOverlapSubmit(
    event: FormEvent<HTMLFormElement>,
    submit: (payload: FormData) => void,
    excludeSlotId?: string,
  ) {
    const formData = new FormData(event.currentTarget);
    const names = findOverlapNames(slots, {
      assignment: String(formData.get("assignment") ?? ""),
      specialty: String(formData.get("specialty") ?? ""),
      weekday: Number(formData.get("weekday")),
      time: String(formData.get("time") ?? "").trim(),
      weekCycle: String(formData.get("weekCycle") ?? cycle) as WeekCycle,
      excludeSlotId,
    });
    if (!names) return;
    event.preventDefault();
    setOverlapPending({ names, formData, submit });
  }

  const detailProps = selected
    ? {
        slot: selected,
        activeChildren,
        assignmentOptions,
        specialtyCatalog,
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
        onOverlapSubmit: handleOverlapSubmit,
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
            {specialtyCatalog.map((spec) => (
              <button
                key={spec.id}
                type="button"
                className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition ${
                  specialty === spec.id
                    ? "border-primary bg-primary text-white"
                    : `${specialtyChipForId(spec.id, specialtyCatalog)} hover:opacity-90`
                }`}
                onClick={() => setSpecialty(spec.id)}
                title={spec.name}
              >
                {spec.shortCode}
              </button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="field mb-0 min-w-[10rem] sm:min-w-[14rem]">
              <label htmlFor="agenda-child-search" className="sr-only">
                Buscar niño
              </label>
              <input
                id="agenda-child-search"
                type="search"
                placeholder="Buscar niño…"
                value={childQuery}
                onChange={(event) => {
                  setChildQuery(event.target.value);
                  setSelectedId(null);
                  setMode("view");
                }}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary py-2 text-sm"
              onClick={() =>
                downloadAgendaPdf({
                  cycle,
                  dayMatrices,
                  specialtyCatalog,
                })
              }
            >
              Exportar PDF
            </button>
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
        </div>

        {!readOnly && showCreate ? (
          <form
            action={createAction}
            className="grid gap-2 rounded-xl border border-border bg-white p-3 sm:grid-cols-2 lg:grid-cols-6"
            onSubmit={(event) => handleOverlapSubmit(event, createAction)}
          >
            <input type="hidden" name="weekCycle" value={cycle} />
            <div className="sm:col-span-2 lg:col-span-2">
              <AssignmentPicker
                id="assignment"
                name="assignment"
                options={assignmentOptions}
              />
            </div>
            <div className="field">
              <label htmlFor="specialty">Especialidad</label>
              <select
                id="specialty"
                name="specialty"
                required
                defaultValue={specialtyCatalog[0]?.id ?? ""}
              >
                {specialtyCatalog.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
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

      <div className="overflow-x-auto pb-1">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${Math.max(dayMatrices.length, 1)}, minmax(15rem, 1fr))`,
            minWidth: `${Math.max(dayMatrices.length, 1) * 16}rem`,
          }}
        >
          {dayMatrices.map(({ day, items, times, specialtiesForDay }) => (
            <section
              key={day}
              className="overflow-hidden rounded-xl border border-border bg-white"
            >
              <div className="border-b border-border bg-[#f7fbfa] px-2.5 py-2">
                <h3 className="text-sm font-semibold leading-tight">
                  {WEEKDAY_LABELS[day]}
                </h3>
              </div>

              {times.length === 0 || specialtiesForDay.length === 0 ? (
                <p className="px-2 py-8 text-center text-xs text-muted">
                  Sin citas
                </p>
              ) : (
                <div className="max-h-[calc(100vh-13.5rem)] overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 z-[1]">
                      <tr className="border-b border-border text-left text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                        <th className="sticky left-0 z-[2] bg-[#f7fbfa] px-1.5 py-1.5 font-semibold">
                          Hora
                        </th>
                        {specialtiesForDay.map((spec) => (
                          <th
                            key={spec.id}
                            className={`min-w-[5.5rem] px-1 py-1.5 font-semibold ${specialtyChipForId(spec.id, specialtyCatalog)}`}
                            title={spec.name}
                          >
                            {spec.shortCode}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {times.map((time) => (
                        <tr
                          key={time}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="sticky left-0 z-[1] bg-white px-1.5 py-1 align-top text-[0.7rem] font-semibold tabular-nums text-muted">
                            {time}
                          </td>
                          {specialtiesForDay.map((spec) => {
                            const cellSlots = items
                              .filter(
                                (slot) =>
                                  slot.time === time &&
                                  slot.specialty === spec.id,
                              )
                              .sort((a, b) =>
                                a.childName.localeCompare(b.childName),
                              );

                            return (
                              <td
                                key={spec.id}
                                className="px-0.5 py-0.5 align-top"
                              >
                                {cellSlots.length === 0 ? null : (
                                  <div className="flex flex-col gap-0.5">
                                    {cellSlots.map((slot) => {
                                      const active = selectedId === slot.id;
                                      return (
                                        <button
                                          key={slot.id}
                                          type="button"
                                          onClick={() => selectSlot(slot.id)}
                                          className={`w-full rounded-md border px-1.5 py-1 text-left transition ${
                                            active
                                              ? "border-ring bg-teal-50 ring-1 ring-ring"
                                              : `border-transparent hover:border-border ${slotChipClass(slot, specialtyCatalog)}`
                                          } ${!slot.childActive ? "opacity-60" : ""}`}
                                          title={`${slot.time} · ${slot.childName} · ${specialtyLabel(slot.specialty, specialtyCatalog)}`}
                                        >
                                          <span className="block truncate text-[0.72rem] font-semibold leading-tight">
                                            {slot.childName}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      {detailProps ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(22,48,43,0.45)]"
            aria-label="Cerrar detalle"
            onClick={() => {
              setSelectedId(null);
              setMode("view");
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-white p-4 shadow-[0_20px_50px_rgba(22,48,43,0.18)] sm:max-w-md sm:rounded-2xl sm:p-5"
          >
            <SlotDetail
              {...detailProps}
              onClose={() => {
                setSelectedId(null);
                setMode("view");
              }}
            />
          </div>
        </div>
      ) : null}

      {overlapPending ? (
        <OverlapConfirmDialog
          names={overlapPending.names}
          onCancel={() => setOverlapPending(null)}
          onConfirm={() => {
            const pendingOverlap = overlapPending;
            setOverlapPending(null);
            startTransition(() => {
              pendingOverlap.submit(pendingOverlap.formData);
            });
          }}
        />
      ) : null}
    </div>
  );
}
