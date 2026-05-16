export const dynamic = "force-dynamic";

import { AppointmentsView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";
import { getAppointmentError, getAppointmentMessage, readAppointmentParam } from "@/lib/appointment-feedback";

interface AppointmentsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const data = await loadAppData();
  const params = searchParams ? await searchParams : undefined;
  const message = getAppointmentMessage(readAppointmentParam(params?.message));
  const error = getAppointmentError(readAppointmentParam(params?.error));
  const notice = error ? { kind: "error" as const, message: error } : message ? { kind: "success" as const, message } : undefined;

  return <AppointmentsView data={data} notice={notice} />;
}
