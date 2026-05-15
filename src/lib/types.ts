export type Role = "owner" | "admin" | "technician" | "front_desk" | "staff";
export type AppointmentStatus = "pending" | "confirmed" | "in_service" | "completed" | "cancelled" | "no_show";
export type OrderStatus = "unpaid" | "partial" | "paid" | "refunded";
export type PaymentMethod = "cash" | "card" | "transfer" | "line_pay" | "other";

export interface Workspace {
  id: string;
  name: string;
  phone: string;
  address: string;
  brandColor: string;
  businessHours: string;
}

export interface StaffMember {
  id: string;
  workspaceId: string;
  name: string;
  role: Role;
  phone: string;
  active: boolean;
  commissionRate: number;
  specialties: string[];
}

export interface ServiceItem {
  id: string;
  workspaceId: string;
  category: string;
  name: string;
  price: number;
  durationMin: number;
  description: string;
  enabled: boolean;
  addOn: boolean;
}

export interface Customer {
  id: string;
  workspaceId: string;
  name: string;
  phone: string;
  birthday?: string;
  lineId?: string;
  note?: string;
  preferences: string[];
  cautions: string[];
  tier: "新客" | "一般" | "VIP" | "VVIP";
  tags: string[];
  lastVisit?: string;
  nextReminder?: string;
}

export interface Appointment {
  id: string;
  workspaceId: string;
  customerId: string;
  serviceIds: string[];
  technicianId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  source: "LINE" | "Instagram" | "電話" | "現場" | "官網";
  note?: string;
}

export interface OrderLine {
  serviceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  workspaceId: string;
  appointmentId?: string;
  customerId: string;
  technicianId: string;
  lines: OrderLine[];
  discount: number;
  tip: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  workspaceId: string;
  brand: string;
  category: string;
  name: string;
  cost: number;
  retailPrice: number;
  quantity: number;
  lowStockThreshold: number;
}

export interface Shift {
  id: string;
  workspaceId: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  leave: boolean;
}
