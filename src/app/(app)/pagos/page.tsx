import { PaymentsBoard } from "@/components/PaymentsBoard";
import { listMonthPayments } from "@/lib/actions/payments";
import { requireEditor } from "@/lib/auth";
import { currentYearMonth } from "@/lib/cycle";

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireEditor();
  const params = await searchParams;
  const yearMonth =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : currentYearMonth();

  const rows = await listMonthPayments(yearMonth);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-primary sm:text-3xl">
          Pagos
        </h1>
        <p className="text-sm text-muted sm:text-base">
          Registra el pago mensual: monto, comprobante y quien lo realiza.
        </p>
      </div>
      <PaymentsBoard yearMonth={yearMonth} rows={rows} />
    </div>
  );
}
