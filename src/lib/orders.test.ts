import { describe, expect, it } from "vitest";
import { orders } from "./seed";
import { orderSubtotal, orderTotal, outstandingAmount } from "./orders";

describe("checkout totals", () => {
  it("calculates subtotal, total and outstanding amount", () => {
    const order = orders.find((item) => item.id === "ord_9002")!;
    expect(orderSubtotal(order)).toBe(3000);
    expect(orderTotal(order)).toBe(3200);
    expect(outstandingAmount(order)).toBe(1600);
  });
});
