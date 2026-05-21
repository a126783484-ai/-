import { describe, expect, it } from "vitest";
import { orders } from "./seed";
import {
  orderPaymentState,
  orderStatusLabel,
  orderStatusTone,
  orderSubtotal,
  orderTotal,
  outstandingAmount,
} from "./orders";

describe("checkout totals", () => {
  it("calculates subtotal, total and outstanding amount", () => {
    const order = orders.find((item) => item.id === "ord_9002")!;
    expect(orderSubtotal(order)).toBe(3000);
    expect(orderTotal(order)).toBe(3200);
    expect(outstandingAmount(order)).toBe(1600);
    expect(orderPaymentState(order)).toBe("partial");
  });

  it("labels payment states for the checkout screen", () => {
    expect(orderStatusLabel("paid")).toBe("已結清");
    expect(orderStatusLabel("partial")).toBe("部分收款");
    expect(orderStatusLabel("unpaid")).toBe("未收款");
    expect(orderStatusTone("paid")).toBe("sage");
    expect(orderStatusTone("partial")).toBe("amber");
    expect(orderStatusTone("unpaid")).toBe("rose");
  });
});
