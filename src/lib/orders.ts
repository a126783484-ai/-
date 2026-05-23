import type { Order, OrderStatus } from "./types";

function normalizeAmount(value: number) {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

export function orderSubtotal(order: Pick<Order, "lines">) {
  return order.lines.reduce(
    (sum, line) => sum + normalizeAmount(line.quantity) * normalizeAmount(line.unitPrice),
    0,
  );
}

export function orderTotal(order: Pick<Order, "lines" | "discount" | "tip">) {
  return Math.max(0, orderSubtotal(order) - normalizeAmount(order.discount) + normalizeAmount(order.tip));
}

export function outstandingAmount(order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount">) {
  return Math.max(0, orderTotal(order) - normalizeAmount(order.paidAmount));
}

export function orderAgeInDays(order: Pick<Order, "createdAt">, now = new Date()) {
  const createdAt = new Date(order.createdAt);
  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(now.getTime())) {
    return 0;
  }

  return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000));
}

export function orderPaymentState(
  order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount">,
): OrderStatus {
  const balance = outstandingAmount(order);
  if (balance <= 0) return "paid";
  if (normalizeAmount(order.paidAmount) > 0) return "partial";
  return "unpaid";
}

export function orderFinancialSummary(
  order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount">,
) {
  const subtotal = orderSubtotal(order);
  const total = orderTotal(order);
  const paidAmount = Math.max(0, normalizeAmount(order.paidAmount));
  const outstanding = Math.max(0, total - paidAmount);

  return {
    subtotal,
    total,
    paidAmount,
    outstanding,
    state: (outstanding <= 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid") as OrderStatus,
  };
}

export function resolveOrderStatus(
  order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount">,
  selectedStatus?: OrderStatus | "",
): OrderStatus {
  return selectedStatus === "refunded" ? "refunded" : orderPaymentState(order);
}

export function orderStatusLabel(status: OrderStatus) {
  if (status === "paid") return "已結清";
  if (status === "partial") return "部分付款";
  if (status === "refunded") return "已退款";
  return "未收款";
}

export function orderStatusTone(status: OrderStatus) {
  if (status === "paid") return "sage" as const;
  if (status === "partial") return "amber" as const;
  if (status === "refunded") return "plum" as const;
  return "rose" as const;
}
