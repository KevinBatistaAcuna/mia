import { AgendaBoard } from "@/components/AgendaBoard";
import { listChildren } from "@/lib/actions/children";
import { listScheduleSlots } from "@/lib/actions/schedule";
import { getSettings } from "@/lib/actions/settings";
import { requireUser } from "@/lib/auth";
import { DEFAULT_ACTIVE_WEEKDAYS } from "@/lib/constants";
import { getWeekCycle, todayLocal } from "@/lib/cycle";

export default async function AgendaPage() {
  const user = await requireUser();
  const [slots, childrenList, settings] = await Promise.all([
    listScheduleSlots(),
    listChildren(true),
    getSettings(),
  ]);

  const initialCycle = settings
    ? getWeekCycle(todayLocal(), settings.cycleStartDate)
    : "A";
  const activeWeekdays = settings?.activeWeekdays ?? [
    ...DEFAULT_ACTIVE_WEEKDAYS,
  ];
  const readOnly = user.role === "therapist";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-primary sm:text-3xl">
            Agenda bisemanal
          </h1>
          <p className="text-sm text-muted sm:text-base">
            {readOnly
              ? "Consulta de horarios. Solo lectura."
              : "Vista compacta por día. Selecciona una cita para reasignar, editar o liberar."}
          </p>
        </div>
      </div>
      <AgendaBoard
        slots={slots}
        childrenList={childrenList}
        initialCycle={initialCycle}
        activeWeekdays={activeWeekdays}
        readOnly={readOnly}
      />
    </div>
  );
}
