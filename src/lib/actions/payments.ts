"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { children, payments } from "@/db/schema";
import { requireEditor } from "@/lib/auth";
import { createId } from "@/lib/id";
import { parseMoneyToCents } from "@/lib/money";
import { todayLocal } from "@/lib/cycle";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type MonthPaymentRow = {
  childId: string;
  childName: string;
  monthlyFeeCents: number;
  payment: {
    id: string;
    amountPaidCents: number;
    receiptNumber: string;
    payerName: string;
  } | null;
};

export async function listMonthPayments(
  yearMonth: string,
): Promise<MonthPaymentRow[]> {
  await requireEditor();

  const kids = await db
    .select({
      id: children.id,
      name: children.name,
      monthlyFeeCents: children.monthlyFeeCents,
      active: children.active,
    })
    .from(children)
    .where(eq(children.active, true))
    .orderBy(asc(children.name));

  const monthPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.yearMonth, yearMonth));

  const byChild = new Map(monthPayments.map((p) => [p.childId, p]));

  return kids.map((kid) => {
    const payment = byChild.get(kid.id);
    return {
      childId: kid.id,
      childName: kid.name,
      monthlyFeeCents: kid.monthlyFeeCents,
      payment: payment
        ? {
            id: payment.id,
            amountPaidCents: payment.amountPaidCents,
            receiptNumber: payment.receiptNumber,
            payerName: payment.payerName,
          }
        : null,
    };
  });
}

export async function markPaymentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireEditor();
  const childId = String(formData.get("childId") ?? "");
  const yearMonth = String(formData.get("yearMonth") ?? "").trim();
  const receiptNumber = String(formData.get("receiptNumber") ?? "").trim();
  const payerName = String(formData.get("payerName") ?? "").trim();
  const paidAt = todayLocal();
  const amountPaidCents = parseMoneyToCents(
    String(formData.get("amountPaid") ?? ""),
  );

  if (!childId || !/^\d{4}-\d{2}$/.test(yearMonth)) {
    return { ok: false, error: "Datos incompletos." };
  }
  if (amountPaidCents == null || amountPaidCents <= 0) {
    return { ok: false, error: "Ingresa un monto pagado válido." };
  }
  if (!receiptNumber) {
    return { ok: false, error: "El número de comprobante es obligatorio." };
  }
  if (!payerName) {
    return { ok: false, error: "Indica quién realiza el pago." };
  }

  const [child] = await db
    .select({ id: children.id })
    .from(children)
    .where(eq(children.id, childId))
    .limit(1);
  if (!child) return { ok: false, error: "Niño no encontrado." };

  const [existing] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(eq(payments.childId, childId), eq(payments.yearMonth, yearMonth)),
    )
    .limit(1);

  if (existing) {
    await db
      .update(payments)
      .set({
        amountPaidCents,
        receiptNumber,
        payerName,
        paidAt,
        markedBy: user.id,
      })
      .where(eq(payments.id, existing.id));
  } else {
    await db.insert(payments).values({
      id: createId(),
      childId,
      yearMonth,
      amountPaidCents,
      receiptNumber,
      payerName,
      paidAt,
      markedBy: user.id,
    });
  }

  revalidatePath("/pagos");
  return { ok: true };
}

export async function clearPaymentAction(paymentId: string): Promise<ActionResult> {
  await requireEditor();
  if (!paymentId) return { ok: false, error: "Pago inválido." };
  await db.delete(payments).where(eq(payments.id, paymentId));
  revalidatePath("/pagos");
  return { ok: true };
}
