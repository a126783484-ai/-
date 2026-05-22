import { describe, expect, it } from "vitest";
import { orders } from "./seed";
import {
  orderFinancialSummary,
  orderPaymentState,
  orderStatusLabel,
  orderStatusTone,
  orderSubtotal,
  orderTotal,
  outstandingAmount,
  resolveOrderStatus,
} from "./orders";

describe("checkout totals", () => {
  it("calculates subtotal, total and outstanding amount", () => {
    const order = orders.find((item) => item.id === "ord_9002")!;
    expect(orderSubtotal(order)).toBe(3000);
    expect(orderTotal(order)).toBe(3200);
    expect(outstandingAmount(order)).toBe(1600);
    expect(orderPaymentState(order)).toBe("partial");
    expect(orderFinancialSummary(order)).toEqual({
      subtotal: 3000,
      total: 3200,
      paidAmount: 1600,
      outstanding: 1600,
      state: "partial",
    });
  });

  it("labels payment states for the checkout screen", () => {
    expect(orderStatusLabel("paid")).toBe("已結清");
    expect(orderStatusLabel("partial")).toBe("部分收款");
    expect(orderStatusLabel("unpaid")).toBe("未收款");
    expect(orderStatusTone("paid")).toBe("sage");
    expect(orderStatusTone("partial")).toBe("amber");
    expect(orderStatusTone("unpaid")).toBe("rose");
  });

  it("derives the checkout status from the money received instead of the selected draft state", () => {
    const order = {
      lines: [{ serviceId: "svc", name: "服務", quantity: 1, unitPrice: 500 }],
      discount: 0,
      tip: 0,
      paidAmount: 0,
    };

    expect(resolveOrderStatus(order, "paid")).toBe("unpaid");
    expect(resolveOrderStatus(order, "partial")).toBe("unpaid");
    expect(resolveOrderStatus(order, "refunded")).toBe("refunded");
  });

  it("treats overpayment as settled and clamps outstanding amount at zero", () => {
    const order = {
      lines: [{ serviceId: "svc", name: "服務", quantity: 1, unitPrice: 500 }],
      discount: 0,
      tip: 0,
      paidAmount: 800,
    };

    expect(orderPaymentState(order)).toBe("paid");
    expect(outstandingAmount(order)).toBe(0);
    expect(orderFinancialSummary(order)).toEqual({
      subtotal: 500,
      total: 500,
      paidAmount: 800,
      outstanding: 0,
      state: "paid",
    });
  });
});
