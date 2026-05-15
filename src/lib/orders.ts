import type { Order } from "./types";

export function orderSubtotal(order: Pick<Order, "lines">) {
  return order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

export function orderTotal(order: Pick<Order, "lines" | "discount" | "tip">) {
  return Math.max(0, orderSubtotal(order) - order.discount + order.tip);
}

export function outstandingAmount(order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount">) {
  return Math.max(0, orderTotal(order) - order.paidAmount);
}
