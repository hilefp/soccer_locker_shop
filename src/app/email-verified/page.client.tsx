"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";

function EmailVerifiedContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  const isSuccess = status === "success";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold">
            {isSuccess ? "Email Verified" : "Verification Failed"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isSuccess
              ? "Your email has been verified successfully. You can now enjoy all features of your account."
              : "This verification link is invalid or has expired. Please request a new verification email."}
          </p>
        </div>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <Link href={isSuccess ? "/" : "/auth/login"}>
              <Button className="w-full">
                {isSuccess ? "Continue Shopping" : "Go to Login"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function EmailVerifiedPageClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmailVerifiedContent />
    </Suspense>
  );
}
