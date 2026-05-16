export const dynamic = "force-dynamic";

import { TechnicianView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";

export default async function TechnicianPage() {
  const data = await loadAppData();
  return <TechnicianView data={data} />;
}
