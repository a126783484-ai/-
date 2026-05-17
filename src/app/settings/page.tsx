export const dynamic = "force-dynamic";

import { SettingsView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";
import { getSettingsError, getSettingsMessage, readSettingsParam } from "@/lib/settings-feedback";

interface SettingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const data = await loadAppData();
  const params = searchParams ? await searchParams : undefined;
  const message = getSettingsMessage(readSettingsParam(params?.message));
  const error = getSettingsError(readSettingsParam(params?.error));
  const notice = error ? { kind: "error" as const, message: error } : message ? { kind: "success" as const, message } : undefined;

  return <SettingsView data={data} notice={notice} />;
}
