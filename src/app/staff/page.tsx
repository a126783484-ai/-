export const dynamic = "force-dynamic";

import { StaffView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";

export default async function StaffPage() {
  const data = await loadAppData();
  return <StaffView data={data} />;
}
