import { AgendaBoard } from "@/components/AgendaBoard";
import { listChildren } from "@/lib/actions/children";
import { listScheduleSlots } from "@/lib/actions/schedule";
import { getSettings } from "@/lib/actions/settings";
import { getWeekCycle, todayLocal } from "@/lib/cycle";

export default async function AgendaPage() {
  const [slots, childrenList, settings] = await Promise.all([
    listScheduleSlots(),
    listChildren(true),
    getSettings(),
  ]);

  const initialCycle = settings
    ? getWeekCycle(todayLocal(), settings.cycleStartDate)
    : "A";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-primary">
          Agenda bisemanal
        </h1>
        <p className="text-muted">
          Administra semana A y B: crear, reasignar, editar o liberar horarios.
        </p>
      </div>
      <AgendaBoard
        slots={slots}
        childrenList={childrenList}
        initialCycle={initialCycle}
      />
    </div>
  );
}
