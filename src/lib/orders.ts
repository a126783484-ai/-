import type { Order, OrderStatus } from "./types";

export function orderSubtotal(order: Pick<Order, "lines">) {
  return order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

export function orderTotal(order: Pick<Order, "lines" | "discount" | "tip">) {
  return Math.max(0, orderSubtotal(order) - order.discount + order.tip);
}

export function outstandingAmount(order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount">) {
  return Math.max(0, orderTotal(order) - order.paidAmount);
}

export function orderPaymentState(
  order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount">,
): OrderStatus {
  const balance = outstandingAmount(order);
  if (balance <= 0) return "paid";
  if (order.paidAmount > 0) return "partial";
  return "unpaid";
}

export function orderStatusLabel(status: OrderStatus) {
  if (status === "paid") return "已結清";
  if (status === "partial") return "部分收款";
  if (status === "refunded") return "已退款";
  return "未收款";
}

export function orderStatusTone(status: OrderStatus) {
  if (status === "paid") return "sage" as const;
  if (status === "partial") return "amber" as const;
  if (status === "refunded") return "plum" as const;
  return "rose" as const;
}
