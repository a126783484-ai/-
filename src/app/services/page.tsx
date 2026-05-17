export const dynamic = "force-dynamic";

import { ServicesView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";
import { getServiceError, getServiceMessage, readServiceParam } from "@/lib/service-feedback";
import { getServiceUpdateError, getServiceUpdateMessage, readServiceUpdateParam } from "@/lib/service-update-feedback";

interface ServicesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const data = await loadAppData();
  const params = searchParams ? await searchParams : undefined;
  const message = getServiceMessage(readServiceParam(params?.message)) ?? getServiceUpdateMessage(readServiceUpdateParam(params?.message));
  const error = getServiceError(readServiceParam(params?.error)) ?? getServiceUpdateError(readServiceUpdateParam(params?.error));
  const notice = error ? { kind: "error" as const, message: error } : message ? { kind: "success" as const, message } : undefined;

  return <ServicesView data={data} notice={notice} />;
}
