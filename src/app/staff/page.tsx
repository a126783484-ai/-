export const dynamic = "force-dynamic";

import { StaffView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";
import { getStaffError, getStaffMessage, readStaffParam } from "@/lib/staff-feedback";

interface StaffPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const data = await loadAppData();
  const params = searchParams ? await searchParams : undefined;
  const message = getStaffMessage(readStaffParam(params?.message));
  const error = getStaffError(readStaffParam(params?.error));
  const notice = error ? { kind: "error" as const, message: error } : message ? { kind: "success" as const, message } : undefined;

  return <StaffView data={data} notice={notice} />;
}
