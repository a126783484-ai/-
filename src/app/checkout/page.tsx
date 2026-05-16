export const dynamic = "force-dynamic";

import { CheckoutView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";

export default async function CheckoutPage() {
  const data = await loadAppData();
  return <CheckoutView data={data} />;
}
