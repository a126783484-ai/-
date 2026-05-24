import type { Order, OrderStatus } from "./types";
import { currency } from "./utils";

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

export function hasOutstandingBalance(order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount">) {
  return outstandingAmount(order) > 0;
}

export function orderCloseoutSummary(
  order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount" | "createdAt">,
  now = new Date(),
) {
  return {
    outstanding: outstandingAmount(order),
    ageDays: orderAgeInDays(order, now),
    paymentState: orderPaymentState(order),
  };
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

export function orderLineSummary(order: Pick<Order, "lines">, maxLines = 3) {
  const visibleLines = order.lines.slice(0, maxLines);
  if (visibleLines.length === 0) {
    return "無明細";
  }

  const summary = visibleLines
    .map((line) => `${line.name} ×${normalizeAmount(line.quantity)}`)
    .join("、");

  if (order.lines.length > maxLines) {
    return `${summary}、+${order.lines.length - maxLines} 項`;
  }

  return summary;
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

export function orderCloseoutLabel(
  order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount" | "createdAt">,
  now = new Date(),
) {
  const summary = orderCloseoutSummary(order, now);
  const ageLabel = summary.ageDays === 0 ? "今天新增" : `已建立 ${summary.ageDays} 天`;
  return `${currency.format(summary.outstanding)} · ${ageLabel}`;
}
