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
  clearPaymentAction,
  markPaymentAction,
  type ActionResult,
  type MonthPaymentRow,
} from "@/lib/actions/payments";
import { centsToInputValue, formatMoney } from "@/lib/money";
import { downloadPaymentsReportCsv } from "@/lib/report-export";

const initial: ActionResult | null = null;

export function PaymentsBoard({
  yearMonth,
  rows,
}: {
  yearMonth: string;
  rows: MonthPaymentRow[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [markState, markAction, markPending] = useActionState(
    markPaymentAction,
    initial,
  );
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (markState?.ok) setRecordingId(null);
  }, [markState]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "pending" && row.payment) return false;
      if (filter === "paid" && !row.payment) return false;
      if (q && !row.childName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, filter]);

  const paidCount = rows.filter((r) => r.payment).length;
  const pendingCount = rows.length - paidCount;

  return (
    <div className="space-y-3">
      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:p-4">
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
                window.location.href = `/pagos?month=${value}`;
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
          <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
            {(
              [
                ["all", `Todos (${rows.length})`],
                ["pending", `Pendientes (${pendingCount})`],
                ["paid", `Pagados (${paidCount})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`rounded-lg px-2.5 py-1.5 text-sm font-semibold transition ${
                  filter === value
                    ? "bg-primary text-white"
                    : "text-muted hover:text-foreground"
                }`}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={paidCount === 0}
          onClick={() => downloadPaymentsReportCsv(yearMonth, rows)}
        >
          Exportar a Excel
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          No hay niños activos para registrar pagos.
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-6 text-center text-muted">
          Ningún registro coincide con el filtro.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <ul className="divide-y divide-border">
            {filtered.map((row) => {
              const recording = recordingId === row.childId;
              const paid = Boolean(row.payment);

              return (
                <li key={row.childId} className="px-3 py-2.5 sm:px-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.childName}</p>
                      <p className="text-xs text-muted sm:text-sm">
                        Cuota {formatMoney(row.monthlyFeeCents)}
                        {row.payment ? (
                          <>
                            {" "}
                            · Pagó {formatMoney(row.payment.amountPaidCents)} ·
                            Comp. {row.payment.receiptNumber} ·{" "}
                            {row.payment.payerName}
                          </>
                        ) : (
                          " · Pendiente"
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex h-8 items-center justify-center rounded-full border px-2.5 text-xs font-semibold leading-none ${
                          paid
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                        }`}
                      >
                        {paid ? "Pagado" : "Pendiente"}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary py-1.5 text-sm"
                        onClick={() =>
                          setRecordingId((id) =>
                            id === row.childId ? null : row.childId,
                          )
                        }
                      >
                        {recording
                          ? "Cerrar"
                          : paid
                            ? "Editar pago"
                            : "Registrar pago"}
                      </button>
                      {row.payment ? (
                        <button
                          type="button"
                          className="btn btn-danger py-1.5 text-sm"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              await clearPaymentAction(row.payment!.id);
                              setRecordingId(null);
                              router.refresh();
                            })
                          }
                        >
                          Quitar
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {recording ? (
                    <form
                      action={markAction}
                      className="mt-3 grid gap-2 rounded-xl border border-border bg-[#f7fbfa] p-3 sm:grid-cols-2 lg:grid-cols-4"
                    >
                      <input type="hidden" name="childId" value={row.childId} />
                      <input type="hidden" name="yearMonth" value={yearMonth} />
                      <div className="field">
                        <label>Monto pagado</label>
                        <input
                          name="amountPaid"
                          type="text"
                          inputMode="decimal"
                          required
                          defaultValue={centsToInputValue(
                            row.payment?.amountPaidCents ??
                              row.monthlyFeeCents,
                          )}
                        />
                      </div>
                      <div className="field">
                        <label>Nº comprobante</label>
                        <input
                          name="receiptNumber"
                          required
                          defaultValue={row.payment?.receiptNumber ?? ""}
                          placeholder="00123"
                        />
                      </div>
                      <div className="field">
                        <label>Quién paga</label>
                        <input
                          name="payerName"
                          required
                          defaultValue={row.payment?.payerName ?? ""}
                          placeholder="Nombre del responsable"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="btn btn-primary w-full"
                          disabled={markPending}
                        >
                          {markPending ? "Guardando..." : "Marcar pagado"}
                        </button>
                      </div>
                      {markState && !markState.ok ? (
                        <p className="text-sm text-rose-700 sm:col-span-2 lg:col-span-4">
                          {markState.error}
                        </p>
                      ) : null}
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
