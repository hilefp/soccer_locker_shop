import { getCurrentUserOrRedirect } from "~/lib/auth";
import { OrderProcessingTimesModal } from "~/ui/components/order-processing-times-modal";

import { CheckoutPageClient } from "./page.client";

export default async function CheckoutPage() {
  await getCurrentUserOrRedirect("/auth/login");

  return (
    <>
      <OrderProcessingTimesModal />
      <CheckoutPageClient />
    </>
  );
}
