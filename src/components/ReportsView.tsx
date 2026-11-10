"use client";

import { SPECIALTY_LABELS } from "@/lib/constants";
import type { Specialty } from "@/db/schema";

type ReportRow = {
  childId: string;
  childName: string;
  percentage: number | null;
  totals: { attended: number; counted: number };
  specialties: Array<{
    specialty: Specialty;
    percentage: number | null;
    attended: number;
    counted: number;
    presente: number;
    tardia: number;
    ausenteJustificado: number;
    ausenteInjustificado: number;
    cancelacion: number;
  }>;
};

export function ReportsView({
  yearMonth,
  rows,
}: {
  yearMonth: string;
  rows: ReportRow[];
}) {
  return (
    <div className="space-y-5">
      <form className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <div className="field">
          <label htmlFor="month">Mes</label>
          <input
            id="month"
            name="month"
            type="month"
            defaultValue={yearMonth}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              window.location.href = `/reportes?month=${value}`;
            }}
          />
        </div>
        <p className="text-sm text-muted sm:pb-2">
          % = (Presente + Tardía) / sesiones contadas. Cancelación fundación no
          penaliza.
        </p>
      </form>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          No hay asistencias registradas en este mes.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.childId} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{row.childName}</h2>
                  <p className="text-sm text-muted">
                    {row.totals.attended}/{row.totals.counted} sesiones
                    contabilizadas
                  </p>
                </div>
                <div className="rounded-2xl bg-[#e7f6f3] px-4 py-2 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Asistencia
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {row.percentage == null ? "—" : `${row.percentage}%`}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {row.specialties.map((spec) => (
                  <div
                    key={spec.specialty}
                    className="rounded-xl border border-border bg-[#f8fbfa] p-3"
                  >
                    <p className="text-sm font-semibold">
                      {SPECIALTY_LABELS[spec.specialty]}
                    </p>
                    <p className="mt-1 text-xl font-bold text-primary">
                      {spec.percentage == null ? "—" : `${spec.percentage}%`}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      P {spec.presente} · T {spec.tardia} · AJ{" "}
                      {spec.ausenteJustificado} · AI {spec.ausenteInjustificado}{" "}
                      · CF {spec.cancelacion}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
