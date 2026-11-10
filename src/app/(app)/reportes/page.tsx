import { ReportsView } from "@/components/ReportsView";
import { getMonthlyReport } from "@/lib/actions/attendance";
import { currentYearMonth } from "@/lib/cycle";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const yearMonth =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : currentYearMonth();

  const rows = await getMonthlyReport(yearMonth);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-primary">
          Reportes
        </h1>
        <p className="text-muted">
          Porcentaje mensual de asistencia por niño y especialidad.
        </p>
      </div>
      <ReportsView yearMonth={yearMonth} rows={rows} />
    </div>
  );
}
