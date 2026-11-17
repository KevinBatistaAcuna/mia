import { AttendanceBoard } from "@/components/AttendanceBoard";
import { getDayAttendance } from "@/lib/actions/attendance";
import { listSpecialties } from "@/lib/actions/settings";
import { requireEditor } from "@/lib/auth";
import { todayLocal } from "@/lib/cycle";

export default async function AsistenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; specialty?: string }>;
}) {
  await requireEditor();
  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    ? params.date
    : todayLocal();

  const specialtyCatalog = await listSpecialties();
  const specialty =
    params.specialty &&
    specialtyCatalog.some((item) => item.id === params.specialty)
      ? params.specialty
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
        specialtyCatalog={specialtyCatalog}
      />
    </div>
  );
}
