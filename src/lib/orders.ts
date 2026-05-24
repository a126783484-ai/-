import type { Order, OrderStatus, PaymentMethod } from "./types";
import { currency, formatDateTime } from "./utils";

function normalizeAmount(value: number) {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

const paymentMethodOrder: PaymentMethod[] = ["cash", "card", "transfer", "line_pay", "other"];

export function paymentMethodLabel(method: PaymentMethod) {
  if (method === "cash") return "現金";
  if (method === "card") return "信用卡";
  if (method === "transfer") return "轉帳";
  if (method === "line_pay") return "LINE Pay";
  return "其他";
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

export function outstandingAmount(
  order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount"> & Partial<Pick<Order, "status">>,
) {
  if (order.status === "refunded") return 0;
  return Math.max(0, orderTotal(order) - normalizeAmount(order.paidAmount));
}

export function hasOutstandingBalance(order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount">) {
  return outstandingAmount(order) > 0;
}

export function orderCloseoutSummary(
  order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount" | "createdAt"> & Partial<Pick<Order, "status">>,
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
  order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount"> & Partial<Pick<Order, "status">>,
): OrderStatus {
  if (order.status === "refunded") return "refunded";
  const balance = outstandingAmount(order);
  if (balance <= 0) return "paid";
  if (normalizeAmount(order.paidAmount) > 0) return "partial";
  return "unpaid";
}

export function orderFinancialSummary(
  order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount"> & Partial<Pick<Order, "status">>,
) {
  const subtotal = orderSubtotal(order);
  const total = orderTotal(order);
  const paidAmount = Math.max(0, normalizeAmount(order.paidAmount));
  const outstanding = order.status === "refunded" ? 0 : Math.max(0, total - paidAmount);

  return {
    subtotal,
    total,
    paidAmount,
    outstanding,
    state: (order.status === "refunded"
      ? "refunded"
      : outstanding <= 0
        ? "paid"
        : paidAmount > 0
          ? "partial"
          : "unpaid") as OrderStatus,
  };
}

export function orderPaymentMethodBreakdown(
  orders: Array<Pick<Order, "paymentMethod" | "lines" | "discount" | "tip" | "paidAmount"> & Partial<Pick<Order, "status">>>,
) {
  const buckets = new Map<PaymentMethod, { count: number; total: number; outstanding: number }>();

  for (const order of orders) {
    const current = buckets.get(order.paymentMethod) ?? { count: 0, total: 0, outstanding: 0 };
    const financial = orderFinancialSummary(order);
    current.count += 1;
    current.total += financial.total;
    current.outstanding += financial.outstanding;
    buckets.set(order.paymentMethod, current);
  }

  return paymentMethodOrder
    .map((method) => {
      const summary = buckets.get(method);
      return summary
        ? {
            method,
            label: paymentMethodLabel(method),
            count: summary.count,
            total: summary.total,
            outstanding: summary.outstanding,
          }
        : null;
    })
    .filter(
      (
        summary,
      ): summary is {
        method: PaymentMethod;
        label: string;
        count: number;
        total: number;
        outstanding: number;
      } => summary !== null,
    )
    .sort((left, right) => right.count - left.count || right.total - left.total || left.label.localeCompare(right.label));
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

export function orderHandoffSummary(
  order: Pick<Order, "lines" | "discount" | "tip" | "paidAmount" | "createdAt" | "paymentMethod"> &
    Partial<Pick<Order, "status">>,
  customerName?: string,
  technicianName?: string,
  now = new Date(),
) {
  const summary = orderCloseoutSummary(order, now);
  const ageLabel = summary.ageDays === 0 ? "今天新增" : `已建立 ${summary.ageDays} 天`;
  return [
    "今天要收",
    orderStatusLabel(summary.paymentState),
    paymentMethodLabel(order.paymentMethod),
    `${customerName ?? "未命名客戶"}／${technicianName ?? "未指派"}`,
    `${currency.format(summary.outstanding)} 尚欠`,
    ageLabel,
    orderLineSummary(order, 2),
  ].join(" · ");
}

export function orderExportSummary(
  order: Pick<Order, "id" | "lines" | "discount" | "tip" | "paidAmount" | "createdAt" | "paymentMethod"> &
    Partial<Pick<Order, "status">>,
  now = new Date(),
) {
  const financial = orderFinancialSummary(order);
  return [
    `#${order.id.slice(0, 8)}`,
    formatDateTime(order.createdAt),
    `總額 ${currency.format(financial.total)}`,
    `付款方式 ${paymentMethodLabel(order.paymentMethod)}`,
    `實收 ${currency.format(financial.paidAmount)}`,
    `尚欠 ${currency.format(financial.outstanding)}`,
    `狀態 ${orderStatusLabel(financial.state)}`,
    `明細 ${orderLineSummary(order, 4)}`,
    `追款 ${orderCloseoutLabel(order, now)}`,
  ].join("｜");
}
