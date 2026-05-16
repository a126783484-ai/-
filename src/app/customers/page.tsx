export const dynamic = "force-dynamic";

import { CustomersView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";

export default async function CustomersPage() {
  const data = await loadAppData();
  return <CustomersView data={data} />;
}
