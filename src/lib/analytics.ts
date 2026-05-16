import { isSameDay, isSameMonth, parseISO } from "date-fns";
import type { Appointment, Customer, Order, ServiceItem, StaffMember } from "./types";
import { orderTotal, outstandingAmount } from "./orders";

export function dashboardMetrics(now: Date, appointments: Appointment[], orders: Order[], customers: Customer[], services: ServiceItem[], staff: StaffMember[]) {
  const todayAppointments = appointments.filter((appointment) => isSameDay(parseISO(appointment.startAt), now));
  const todayOrders = orders.filter((order) => isSameDay(parseISO(order.createdAt), now));
  const monthOrders = orders.filter((order) => isSameMonth(parseISO(order.createdAt), now));
  const completedOrActive = appointments.filter((appointment) => !["cancelled", "no_show"].includes(appointment.status));
  const cancelled = appointments.filter((appointment) => appointment.status === "cancelled").length;
  const noShows = appointments.filter((appointment) => appointment.status === "no_show").length;

  const technicianRevenue = staff
    .filter((member) => member.role === "technician")
    .map((member) => ({
      name: member.name,
      revenue: monthOrders.filter((order) => order.technicianId === member.id).reduce((sum, order) => sum + orderTotal(order), 0),
      services: completedOrActive.filter((appointment) => appointment.technicianId === member.id).length
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const serviceRanking = services
    .map((service) => ({
      name: service.name,
      count: appointments.filter((appointment) => appointment.serviceIds.includes(service.id)).length
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    todayAppointments: todayAppointments.length,
    todayRevenue: todayOrders.reduce((sum, order) => sum + orderTotal(order), 0),
    monthRevenue: monthOrders.reduce((sum, order) => sum + orderTotal(order), 0),
    pendingPayment: orders.reduce((sum, order) => sum + outstandingAmount(order), 0),
    upcoming: todayAppointments.filter((appointment) => ["pending", "confirmed"].includes(appointment.status)),
    newCustomers: customers.filter((customer) => customer.tier === "新客").length,
    returningCustomers: customers.filter((customer) => customer.lastVisit).length,
    cancellationRate: appointments.length ? cancelled / appointments.length : 0,
    noShowRate: appointments.length ? noShows / appointments.length : 0,
    technicianRevenue,
    serviceRanking
  };
}
