export const dynamic = "force-dynamic";

import { CustomersView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";
import { getCustomerError, getCustomerMessage, readCustomerParam } from "@/lib/customer-feedback";
import { getCustomerUpdateError, getCustomerUpdateMessage, readCustomerUpdateParam } from "@/lib/customer-update-feedback";

interface CustomersPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const data = await loadAppData();
  const params = searchParams ? await searchParams : undefined;
  const message = getCustomerMessage(readCustomerParam(params?.message)) ?? getCustomerUpdateMessage(readCustomerUpdateParam(params?.message));
  const error = getCustomerError(readCustomerParam(params?.error)) ?? getCustomerUpdateError(readCustomerUpdateParam(params?.error));
  const notice = error ? { kind: "error" as const, message: error } : message ? { kind: "success" as const, message } : undefined;

  return <CustomersView data={data} notice={notice} />;
}
