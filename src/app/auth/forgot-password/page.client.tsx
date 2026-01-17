"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { requestPasswordReset } from "~/lib/api/auth";
import { forgotPasswordSchema } from "~/lib/validations/auth";
import type { ForgotPasswordFormData } from "~/lib/validations/auth";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";

export function ForgotPasswordPageClient() {
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await requestPasswordReset({ email: data.email });
      setSuccess(true);
      toast.success("Password reset instructions sent to your email");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send reset instructions",
      );
      console.error(err);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold">Check Your Email</h2>
            <p className="text-sm text-muted-foreground">
              We've sent password reset instructions to your email address.
            </p>
          </div>

          <Card className="border-none shadow-none">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  If you don't see the email, check your spam folder.
                </p>
                <Link href="/auth/login">
                  <Button className="w-full" variant="outline">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold">Forgot Password</h2>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we'll send you instructions to reset your
            password.
          </p>
        </div>

        <Card className="border-none shadow-none">
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Sending..." : "Send Reset Instructions"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link
                className={`
                  text-primary underline-offset-4
                  hover:underline
                `}
                href="/auth/login"
              >
                Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
