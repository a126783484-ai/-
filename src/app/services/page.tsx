export const dynamic = "force-dynamic";

import { ServicesView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";

export default async function ServicesPage() {
  const data = await loadAppData();
  return <ServicesView data={data} />;
}
