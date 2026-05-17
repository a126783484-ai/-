export const dynamic = "force-dynamic";

import { CheckoutDeferredView } from "@/components/DeferredViews";
import { loadAppData } from "@/lib/app-data";

export default async function CheckoutPage() {
  const data = await loadAppData();
  return <CheckoutDeferredView data={data} />;
}
