"use client";

import { useMemo, useState } from "react";
import {
  specialtyLabel,
  specialtyShort,
  type SpecialtyInfo,
} from "@/lib/constants";
import { downloadAttendanceReportCsv } from "@/lib/report-export";
import type { Specialty } from "@/db/schema";

type SpecStats = {
  specialty: Specialty;
  percentage: number | null;
  attended: number;
  counted: number;
  presente: number;
  tardia: number;
  ausenteJustificado: number;
  ausenteInjustificado: number;
  cancelacion: number;
};

type ReportRow = {
  childId: string;
  childName: string;
  percentage: number | null;
  totals: { attended: number; counted: number };
  specialties: SpecStats[];
};

function pctLabel(value: number | null) {
  return value == null ? "—" : `${value}%`;
}

function pctTone(value: number | null) {
  if (value == null) return "text-muted";
  if (value >= 85) return "text-emerald-700";
  if (value >= 70) return "text-amber-700";
  return "text-rose-700";
}

export function ReportsView({
  yearMonth,
  rows,
  specialtyCatalog,
}: {
  yearMonth: string;
  rows: ReportRow[];
  specialtyCatalog: SpecialtyInfo[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const columns = useMemo(() => {
    const seen = new Set(specialtyCatalog.map((s) => s.id));
    const extras = rows
      .flatMap((row) => row.specialties.map((s) => s.specialty))
      .filter((id) => !seen.has(id));
    const uniqueExtras = [...new Set(extras)].map((id) => ({
      id,
      name: id,
      shortCode: id.toUpperCase().slice(0, 4),
      active: false,
      sortOrder: 999,
    }));
    return [...specialtyCatalog, ...uniqueExtras];
  }, [rows, specialtyCatalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.childName.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-3">
      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-end sm:justify-between sm:p-4">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
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
          <div className="field min-w-0 flex-1 sm:max-w-xs">
            <label htmlFor="search">Buscar niño</label>
            <input
              id="search"
              type="search"
              placeholder="Nombre…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted sm:pb-2 sm:text-sm">
            {filtered.length} niño(s) · % = (Presente + Tardía) / sesiones
            contadas
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={rows.length === 0}
          onClick={() => downloadAttendanceReportCsv(yearMonth, rows)}
        >
          Exportar a Excel
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          No hay asistencias registradas en este mes.
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-6 text-center text-muted">
          Ningún niño coincide con la búsqueda.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead className="sticky top-0 z-[1] bg-[#f7fbfa] text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-semibold">Niño</th>
                  <th className="px-2 py-2 text-right font-semibold">Total</th>
                  <th className="hidden px-2 py-2 text-right font-semibold sm:table-cell">
                    Sesiones
                  </th>
                  {columns.map((spec) => (
                    <th
                      key={spec.id}
                      className="px-2 py-2 text-right font-semibold"
                      title={specialtyLabel(spec.id, columns)}
                    >
                      {specialtyShort(spec.id, columns)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const open = expandedId === row.childId;
                  const bySpec = Object.fromEntries(
                    row.specialties.map((s) => [s.specialty, s]),
                  ) as Partial<Record<Specialty, SpecStats>>;

                  return (
                    <tr
                      key={row.childId}
                      className={`border-b border-border last:border-b-0 ${
                        open ? "bg-teal-50/60" : "hover:bg-[#f7fbfa]"
                      }`}
                    >
                      <td className="px-3 py-1.5 align-top">
                        <button
                          type="button"
                          className="w-full truncate text-left font-semibold hover:text-primary"
                          onClick={() =>
                            setExpandedId((id) =>
                              id === row.childId ? null : row.childId,
                            )
                          }
                          title="Ver detalle"
                        >
                          {row.childName}
                        </button>
                        {open ? (
                          <div className="mt-1 space-y-0.5 pb-1 text-xs text-muted">
                            {row.specialties.map((spec) => (
                              <p key={spec.specialty}>
                                {specialtyShort(spec.specialty, columns)}: P{" "}
                                {spec.presente} · T {spec.tardia} · AJ{" "}
                                {spec.ausenteJustificado} · AI{" "}
                                {spec.ausenteInjustificado} · CF{" "}
                                {spec.cancelacion}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td
                        className={`px-2 py-1.5 align-top text-right text-base font-bold tabular-nums ${pctTone(row.percentage)}`}
                      >
                        {pctLabel(row.percentage)}
                      </td>
                      <td className="hidden px-2 py-1.5 align-top text-right tabular-nums text-muted sm:table-cell">
                        {row.totals.attended}/{row.totals.counted}
                      </td>
                      {columns.map((spec) => {
                        const stats = bySpec[spec.id];
                        return (
                          <td
                            key={spec.id}
                            className={`px-2 py-1.5 align-top text-right tabular-nums ${pctTone(stats?.percentage ?? null)}`}
                            title={
                              stats
                                ? `${specialtyLabel(spec.id, columns)}: ${stats.attended}/${stats.counted}`
                                : specialtyLabel(spec.id, columns)
                            }
                          >
                            {pctLabel(stats?.percentage ?? null)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
