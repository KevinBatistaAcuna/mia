type ReportRow = {
  childName: string;
  percentage: number | null;
  totals: { attended: number; counted: number };
};

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function pct(value: number | null): string {
  return value == null ? "" : String(value).replace(".", ",");
}

/** CSV con BOM UTF-8 y separador `;` para abrir bien en Excel (ES). */
export function buildAttendanceReportCsv(
  yearMonth: string,
  rows: ReportRow[],
): string {
  const header = ["Mes", "Niño", "% asistencia", "Asistidas", "Contadas"];
  const lines = [header.map(csvCell).join(";")];

  for (const row of rows) {
    lines.push(
      [
        yearMonth,
        row.childName,
        pct(row.percentage),
        row.totals.attended,
        row.totals.counted,
      ]
        .map(csvCell)
        .join(";"),
    );
  }

  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadAttendanceReportCsv(
  yearMonth: string,
  rows: ReportRow[],
) {
  const csv = buildAttendanceReportCsv(yearMonth, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `asistencia-${yearMonth}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type PaymentExportRow = {
  childName: string;
  payment: {
    amountPaidCents: number;
    receiptNumber: string;
    payerName: string;
  } | null;
};

function moneyCsv(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = String(cents % 100).padStart(2, "0");
  return `${whole},${frac}`;
}

export function buildPaymentsReportCsv(
  yearMonth: string,
  rows: PaymentExportRow[],
): string {
  const header = [
    "Mes",
    "Nombre del niño",
    "Monto pagado",
    "Número de comprobante",
    "Nombre de quien paga",
  ];
  const lines = [header.map(csvCell).join(";")];

  for (const row of rows) {
    if (!row.payment) continue;
    lines.push(
      [
        yearMonth,
        row.childName,
        moneyCsv(row.payment.amountPaidCents),
        row.payment.receiptNumber,
        row.payment.payerName,
      ]
        .map(csvCell)
        .join(";"),
    );
  }

  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadPaymentsReportCsv(
  yearMonth: string,
  rows: PaymentExportRow[],
) {
  const csv = buildPaymentsReportCsv(yearMonth, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pagos-${yearMonth}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
