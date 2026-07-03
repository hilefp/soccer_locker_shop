"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { resetPasswordSchema } from "~/lib/validations/auth";
import type { ResetPasswordFormData } from "~/lib/validations/auth";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error("Invalid or missing reset token");
      return;
    }

    try {
      const response = await fetch("/api/shop/auth/reset-password", {
        body: JSON.stringify({ newPassword: data.password, token }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || "Failed to reset password");
      }
      setSuccess(true);
      toast.success("Password reset successfully!");
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reset password",
      );
      console.error(err);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold">Invalid Reset Link</h2>
            <p className="text-sm text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <Link href="/auth/forgot-password">
                <Button className="w-full">Request New Reset Link</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold">Password Reset Successful</h2>
            <p className="text-sm text-muted-foreground">
              Your password has been reset successfully. Redirecting to login...
            </p>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <Link href="/auth/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
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
          <h2 className="text-3xl font-bold">Reset Password</h2>
          <p className="text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        <Card className="border-none shadow-none">
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    className="pr-10"
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                  />
                  <button
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className={`
                      absolute inset-y-0 right-0 flex items-center px-3
                      text-muted-foreground
                      hover:text-foreground
                    `}
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    className="pr-10"
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword")}
                  />
                  <button
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    className={`
                      absolute inset-y-0 right-0 flex items-center px-3
                      text-muted-foreground
                      hover:text-foreground
                    `}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    tabIndex={-1}
                    type="button"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Resetting..." : "Reset Password"}
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

export function ResetPasswordPageClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
