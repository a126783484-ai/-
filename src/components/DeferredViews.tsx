"use client";

import dynamic from "next/dynamic";
import type { AppData } from "@/lib/app-data";
import { LoadingState } from "./ui";

const DashboardViewImpl = dynamic(() => import("@/components/ModuleViews").then((mod) => mod.DashboardView), {
  ssr: false,
  loading: () => <LoadingState />
});

const AppointmentsViewImpl = dynamic(() => import("@/components/ModuleViews").then((mod) => mod.AppointmentsView), {
  ssr: false,
  loading: () => <LoadingState />
});

const CustomersViewImpl = dynamic(() => import("@/components/ModuleViews").then((mod) => mod.CustomersView), {
  ssr: false,
  loading: () => <LoadingState />
});

const CheckoutViewImpl = dynamic(() => import("@/components/ModuleViews").then((mod) => mod.CheckoutView), {
  ssr: false,
  loading: () => <LoadingState />
});

export function DashboardDeferredView({ data }: { data: AppData }) {
  return <DashboardViewImpl data={data} />;
}

export function AppointmentsDeferredView({ data, notice }: { data: AppData; notice?: { kind: "error" | "success"; message: string } }) {
  return <AppointmentsViewImpl data={data} notice={notice} />;
}

export function CustomersDeferredView({ data, notice }: { data: AppData; notice?: { kind: "error" | "success"; message: string } }) {
  return <CustomersViewImpl data={data} notice={notice} />;
}

export function CheckoutDeferredView({ data }: { data: AppData }) {
  return <CheckoutViewImpl data={data} />;
}
