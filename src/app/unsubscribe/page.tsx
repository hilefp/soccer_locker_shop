import type { Metadata } from "next";

import { UnsubscribePageClient } from "./page.client";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Unsubscribe",
};

export default function UnsubscribePage() {
  return <UnsubscribePageClient />;
}
