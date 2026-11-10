"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  markAttendanceAction,
  type DayAttendanceItem,
} from "@/lib/actions/attendance";
import {
  SPECIALTY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  WEEKDAY_LABELS,
} from "@/lib/constants";
import {
  attendanceStatuses,
  specialties,
  type AttendanceStatus,
  type Specialty,
  type WeekCycle,
} from "@/db/schema";

export function AttendanceBoard({
  date,
  weekCycle,
  weekday,
  items,
}: {
  date: string;
  weekCycle: WeekCycle;
  weekday: number;
  items: DayAttendanceItem[];
}) {
  const router = useRouter();
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | "all">(
    "all",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      selectedSpecialty === "all"
        ? items
        : items.filter((i) => i.specialty === selectedSpecialty),
    [items, selectedSpecialty],
  );

  const pendingCount = filtered.filter((i) => !i.status).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filtered.map((i) => i.slotId)));
  }

  function applyStatus(status: AttendanceStatus, slotIds?: string[]) {
    const ids = slotIds ?? Array.from(selected);
    if (ids.length === 0) {
      setMessage("Selecciona al menos un niño.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await markAttendanceAction(date, ids, status);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setSelected(new Set());
      setMessage(`Se marcó ${STATUS_LABELS[status]} en ${ids.length} cita(s).`);
      router.refresh();
    });
  }

  function markPendingPresent() {
    const ids = filtered.filter((i) => !i.status).map((i) => i.slotId);
    if (ids.length === 0) {
      setMessage("No hay pendientes por marcar.");
      return;
    }
    applyStatus("presente", ids);
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">
              Semana {weekCycle}
              {weekday > 0 ? ` · ${WEEKDAY_LABELS[weekday]}` : " · Domingo"}
            </p>
            <h2 className="text-xl font-semibold">Citas del día</h2>
          </div>
          <form className="field">
            <label htmlFor="date">Fecha</label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={date}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                window.location.href = `/asistencia?date=${value}`;
              }}
            />
          </form>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn ${selectedSpecialty === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setSelectedSpecialty("all");
              setSelected(new Set());
            }}
          >
            Todas
          </button>
          {specialties.map((spec) => (
            <button
              key={spec}
              type="button"
              className={`btn ${selectedSpecialty === spec ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setSelectedSpecialty(spec);
                setSelected(new Set());
              }}
            >
              {SPECIALTY_LABELS[spec]}
            </button>
          ))}
        </div>
      </div>

      {weekday === 0 ? (
        <div className="card p-8 text-center text-muted">
          No hay agenda programada para domingos.
        </div>
      ) : (
        <>
          <div className="card space-y-3 border border-border p-4 sm:sticky sm:top-[6.5rem] sm:z-10 sm:shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted">
                {selected.size} seleccionado(s) · {pendingCount} pendiente(s)
              </p>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={toggleAll}>
                  {selected.size === filtered.length && filtered.length > 0
                    ? "Quitar selección"
                    : "Seleccionar todos"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary flex-1 sm:flex-none"
                  disabled={pending}
                  onClick={markPendingPresent}
                >
                  Pendientes → Presente
                </button>
              </div>
            </div>
            <div className="hidden flex-wrap gap-2 sm:flex">
              {attendanceStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className="btn btn-secondary"
                  disabled={pending || selected.size === 0}
                  onClick={() => applyStatus(status)}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
            {message ? (
              <p className="text-sm text-primary-dark">{message}</p>
            ) : null}
          </div>

          <ul className="space-y-2 pb-28 sm:pb-0">
            {filtered.length === 0 ? (
              <li className="card p-8 text-center text-muted">
                No hay citas para esta fecha y filtro.
              </li>
            ) : (
              filtered.map((item) => {
                const isSelected = selected.has(item.slotId);
                return (
                  <li key={item.slotId}>
                    <button
                      type="button"
                      onClick={() => toggle(item.slotId)}
                      className={`card flex w-full items-center gap-3 px-4 py-4 text-left transition active:scale-[0.99] sm:py-4 ${
                        isSelected ? "ring-2 ring-ring" : ""
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          isSelected
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-white"
                        }`}
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">
                          {item.time} · {item.childName}
                        </span>
                        <span className="block text-sm text-muted">
                          {SPECIALTY_LABELS[item.specialty]}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          item.status
                            ? STATUS_COLORS[item.status]
                            : "border-dashed border-slate-300 text-slate-500"
                        }`}
                      >
                        {item.status ? STATUS_LABELS[item.status] : "Pendiente"}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-[rgba(243,247,246,0.96)] p-3 backdrop-blur sm:hidden">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-[env(safe-area-inset-bottom)]">
              {attendanceStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className="btn btn-secondary shrink-0"
                  disabled={pending || selected.size === 0}
                  onClick={() => applyStatus(status)}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
