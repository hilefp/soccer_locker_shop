import { getCurrentUserOrRedirect } from "~/lib/auth";

import { ConfirmPageClient } from "./page.client";

export default async function CheckoutConfirmPage() {
  await getCurrentUserOrRedirect("/auth/login");

  return <ConfirmPageClient />;
}
