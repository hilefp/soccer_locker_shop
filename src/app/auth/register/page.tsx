import { redirect } from "next/navigation";

import { SYSTEM_CONFIG } from "~/app";
import { getCurrentUser } from "~/lib/api/auth-server";

import { RegisterPageClient } from "./page.client";

export default async function RegisterPage() {
  // Redirect if already authenticated
  const user = await getCurrentUser();
  if (user) {
    redirect(SYSTEM_CONFIG.redirectAfterSignUp);
  }

  return <RegisterPageClient />;
}
