export const dynamic = "force-dynamic";

import { CheckoutDeferredView } from "@/components/DeferredViews";
import { loadAppData } from "@/lib/app-data";
import { getCheckoutError, getCheckoutMessage, readCheckoutParam } from "@/lib/checkout-feedback";

interface CheckoutPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const data = await loadAppData();
  const params = searchParams ? await searchParams : undefined;
  const message = getCheckoutMessage(readCheckoutParam(params?.message));
  const error = getCheckoutError(readCheckoutParam(params?.error));
  const notice = error ? { kind: "error" as const, message: error } : message ? { kind: "success" as const, message } : undefined;

  return <CheckoutDeferredView data={data} notice={notice} />;
}
