import { AttendanceBoard } from "@/components/AttendanceBoard";
import { getDayAttendance } from "@/lib/actions/attendance";
import { todayLocal } from "@/lib/cycle";
import type { Specialty } from "@/db/schema";

export default async function AsistenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; specialty?: string }>;
}) {
  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    ? params.date
    : todayLocal();
  const specialty =
    params.specialty === "fisica" ||
    params.specialty === "lenguaje" ||
    params.specialty === "ocupacional"
      ? (params.specialty as Specialty)
      : undefined;

  const data = await getDayAttendance(date, specialty);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-primary">
          Asistencia
        </h1>
        <p className="text-muted">
          Selecciona varios niños y aplica un estado en bloque.
        </p>
      </div>
      <AttendanceBoard
        date={date}
        weekCycle={data.weekCycle}
        weekday={data.weekday}
        items={data.items}
      />
    </div>
  );
}
