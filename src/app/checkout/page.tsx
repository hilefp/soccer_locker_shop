import { getCurrentUserOrRedirect } from "~/lib/auth";

import { CheckoutPageClient } from "./page.client";

export default async function CheckoutPage() {
  await getCurrentUserOrRedirect("/auth/login");

  return <CheckoutPageClient />;
}
