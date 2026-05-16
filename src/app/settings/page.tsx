export const dynamic = "force-dynamic";

import { SettingsView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";

export default async function SettingsPage() {
  const data = await loadAppData();
  return <SettingsView data={data} />;
}
