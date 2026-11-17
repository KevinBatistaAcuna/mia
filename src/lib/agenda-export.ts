import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  specialtyShort,
  WEEKDAY_LABELS,
  type SpecialtyInfo,
} from "@/lib/constants";
import type { Specialty, WeekCycle } from "@/db/schema";

type AgendaSlot = {
  childName: string;
  specialty: Specialty;
  weekday: number;
  time: string;
  weekCycle: WeekCycle;
};

type DayMatrix = {
  day: number;
  items: AgendaSlot[];
  times: string[];
  specialtiesForDay: SpecialtyInfo[];
};

export function downloadAgendaPdf({
  cycle,
  dayMatrices,
  specialtyCatalog,
}: {
  cycle: WeekCycle;
  dayMatrices: DayMatrix[];
  specialtyCatalog: SpecialtyInfo[];
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "letter",
  });

  let cursorY = 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 118, 110);
  doc.text("Agenda", 14, cursorY);
  doc.setTextColor(0);
  cursorY += 2;

  const daysWithContent = dayMatrices.filter(
    (day) => day.times.length > 0 && day.specialtiesForDay.length > 0,
  );

  if (daysWithContent.length === 0) {
    cursorY += 10;
    doc.setFontSize(11);
    doc.text("No hay horarios para exportar con el filtro actual.", 14, cursorY);
    doc.save(`agenda-semana-${cycle}.pdf`);
    return;
  }

  for (const day of daysWithContent) {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (cursorY > pageHeight - 50) {
      doc.addPage();
      cursorY = 16;
    }

    cursorY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 118, 110);
    doc.text(WEEKDAY_LABELS[day.day] ?? `Día ${day.day}`, 14, cursorY);
    doc.setTextColor(0);

    const head = [
      [
        "Hora",
        ...day.specialtiesForDay.map((spec) =>
          specialtyShort(spec.id, specialtyCatalog),
        ),
      ],
    ];

    const body = day.times.map((time) => [
      time,
      ...day.specialtiesForDay.map((spec) => {
        const names = day.items
          .filter(
            (slot) => slot.time === time && slot.specialty === spec.id,
          )
          .map((slot) => slot.childName)
          .sort((a, b) => a.localeCompare(b));
        return names.join("\n");
      }),
    ]);

    autoTable(doc, {
      startY: cursorY + 3,
      head,
      body,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        valign: "top",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: 255,
        fontStyle: "bold",
        halign: "left",
      },
      columnStyles: {
        0: { cellWidth: 16, fontStyle: "bold", textColor: [91, 115, 109] },
      },
      margin: { left: 14, right: 14 },
    });

    const table = (
      doc as unknown as {
        lastAutoTable?: { finalY: number };
      }
    ).lastAutoTable;

    cursorY = (table?.finalY ?? cursorY + 20) + 2;
  }

  doc.save(`agenda-semana-${cycle}.pdf`);
}
