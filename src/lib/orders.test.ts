import { describe, expect, it } from "vitest";
import { orders } from "./seed";
import {
  orderFinancialSummary,
  orderAgeInDays,
  orderLineSummary,
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
    expect(orderStatusLabel("partial")).toBe("部分付款");
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

  it("summarizes order lines for print-ready reports", () => {
    const order = {
      lines: [
        { serviceId: "svc1", name: "單色凝膠", quantity: 1, unitPrice: 1200 },
        { serviceId: "svc2", name: "保養", quantity: 2, unitPrice: 800 },
        { serviceId: "svc3", name: "卸甲", quantity: 1, unitPrice: 600 },
        { serviceId: "svc4", name: "加購修型", quantity: 1, unitPrice: 300 },
      ],
    };

    expect(orderLineSummary(order)).toBe("單色凝膠 ×1、保養 ×2、卸甲 ×1、+1 項");
    expect(orderLineSummary({ lines: [] })).toBe("無明細");
    expect(orderLineSummary(order, 2)).toBe("單色凝膠 ×1、保養 ×2、+2 項");
  });

  it("measures how old an order is in whole days for follow-up sorting", () => {
    expect(
      orderAgeInDays(
        { createdAt: "2026-05-20T08:30:00.000Z" },
        new Date("2026-05-23T08:30:00.000Z"),
      ),
    ).toBe(3);
    expect(
      orderAgeInDays(
        { createdAt: "2026-05-23T08:30:00.000Z" },
        new Date("2026-05-23T08:31:00.000Z"),
      ),
    ).toBe(0);
  });
});
