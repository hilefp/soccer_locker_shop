"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { unsubscribeFromNewsletter } from "~/lib/api/newsletter";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";

type State = "done" | "error" | "idle" | "loading";

export function UnsubscribePageClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}

/**
 * Confirmation step on purpose: email security scanners open every link in a
 * message, so unsubscribing on page load would silently opt people out.
 */
function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("u") ?? "";
  const token = searchParams.get("t") ?? "";
  const hasLink = !!userId && !!token;
  const [state, setState] = useState<State>(hasLink ? "idle" : "error");

  const handleUnsubscribe = async () => {
    setState("loading");
    try {
      await unsubscribeFromNewsletter(userId, token);
      setState("done");
    } catch {
      setState("error");
    }
  };

  const title =
    state === "done"
      ? "You're unsubscribed"
      : state === "error"
        ? "Something went wrong"
        : "Unsubscribe from Soccer Locker emails";

  const description =
    state === "done"
      ? "You won't receive marketing emails from us anymore. You'll still get emails about your orders."
      : state === "error"
        ? "This unsubscribe link is invalid or incomplete. Please use the link from the latest email, or contact teamorder@soccerlocker.com."
        : "You'll stop receiving sales and promotions by email. Emails about your orders are not affected.";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Card className="border-none shadow-sm">
          <CardContent className="space-y-3 pt-6">
            {(state === "idle" || state === "loading") && (
              <Button
                className="w-full"
                disabled={state === "loading"}
                onClick={handleUnsubscribe}
              >
                {state === "loading" ? "Unsubscribing..." : "Unsubscribe"}
              </Button>
            )}
            <Link href="/">
              <Button
                className="w-full"
                variant={state === "done" || state === "error" ? "default" : "outline"}
              >
                Continue Shopping
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
