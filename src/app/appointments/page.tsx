export const dynamic = "force-dynamic";

import { AppointmentsView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";

export default async function AppointmentsPage() {
  const data = await loadAppData();
  return <AppointmentsView data={data} />;
}
