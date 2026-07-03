"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { SEO_CONFIG, SYSTEM_CONFIG } from "~/app";
import { useAuth } from "~/lib/hooks/use-auth";
import { registerSchema } from "~/lib/validations/auth";
import type { RegisterFormData } from "~/lib/validations/auth";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";

export function RegisterPageClient() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [step, setStep] = useState(1);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    trigger,
    getValues,
  } = useForm<RegisterFormData>({
    defaultValues: {
      newsletter: false,
    },
    resolver: zodResolver(registerSchema),
  });

  const nextStep = async () => {
    const fields = getStepFields(step);
    const isValid = await trigger(fields);
    if (isValid) {
      setStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const getStepFields = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return ["email", "password", "confirmPassword"] as const;
      case 2:
        return ["firstName", "lastName", "phone"] as const;
      case 3:
        return ["address", "city", "state", "country", "postalCode"] as const;
      default:
        return [] as const;
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    // Guard against premature submission: pressing Enter on an earlier step
    // triggers the form's submit handler even though all required fields may
    // already be valid. Only create the account from the final step.
    if (step < 3) {
      await nextStep();
      return;
    }

    try {
      // Remove confirmPassword before sending
      const { confirmPassword: _confirmPassword, ...registerData } = data;
      await registerUser(registerData);
      setShowSuccessDialog(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Registration failed",
      );
      console.error(err);
    }
  };

  return (
    <div
      className={`
        grid min-h-screen w-full overflow-hidden
        md:grid-cols-2
      `}
    >
      {/* Left side - Image */}
      <div
        className={`
          relative hidden
          md:block
        `}
      >
        <Image
          alt="Register background image"
          className="object-cover"
          fill
          priority
          sizes="(max-width: 768px) 0vw, 50vw"
          src="/WC-Hist-Set.jpg"
        />
        <div
          className={`
            absolute inset-0 bg-gradient-to-t from-background/80 to-transparent
          `}
        />
        <div className="absolute bottom-8 left-8 z-10 text-white">
          <h1 className="text-3xl font-bold">{SEO_CONFIG.name}</h1>
          <p className="mt-2 max-w-md text-sm text-white/80">
            {SEO_CONFIG.slogan}
          </p>
        </div>
      </div>

      {/* Right side - Register form */}
      <div
        className={`
          flex items-center justify-center p-4
          md:p-8
        `}
      >
        <div className="w-full max-w-md space-y-4">
          <div
            className={`
              space-y-4 text-center
              md:text-left
            `}
          >
            <h2 className="text-3xl font-bold">Create Account</h2>
            <p className="text-sm text-muted-foreground">
              Step {step} of 3 - {getStepTitle(step)}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`
                  h-2 flex-1 rounded-full
                  ${i <= step ? "bg-primary" : "bg-muted"}
                `}
              />
            ))}
          </div>

          <Card className="border-none shadow-none">
            <CardContent className="pt-2">
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                {/* Step 1: Account Credentials */}
                {step === 1 && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email *</Label>
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
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password *</Label>
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
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          className="pr-10"
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          {...register("confirmPassword")}
                        />
                        <button
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                          className={`
                            absolute inset-y-0 right-0 flex items-center px-3
                            text-muted-foreground
                            hover:text-foreground
                          `}
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
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
                  </>
                )}

                {/* Step 2: Personal Information */}
                {step === 2 && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        {...register("firstName")}
                      />
                      {errors.firstName && (
                        <p className="text-sm text-destructive">
                          {errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        {...register("lastName")}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-destructive">
                          {errors.lastName.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        placeholder="+1 (555) 123-4567"
                        type="tel"
                        {...register("phone")}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Step 3: Address */}
                {step === 3 && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="address">Address (Optional)</Label>
                      <Input
                        id="address"
                        placeholder="123 Main St"
                        {...register("address")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="city">City (Optional)</Label>
                        <Input
                          id="city"
                          placeholder="New York"
                          {...register("city")}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="state">State (Optional)</Label>
                        <Input
                          id="state"
                          placeholder="NY"
                          {...register("state")}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="country">Country (Optional)</Label>
                        <Input
                          id="country"
                          placeholder="USA"
                          {...register("country")}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="postalCode">Postal Code (Optional)</Label>
                        <Input
                          id="postalCode"
                          placeholder="10001"
                          {...register("postalCode")}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-4">
                  {step > 1 && (
                    <Button
                      className="flex-1"
                      onClick={prevStep}
                      type="button"
                      variant="outline"
                    >
                      Back
                    </Button>
                  )}
                  {step < 3 ? (
                    <Button
                      className="flex-1"
                      key="next-button"
                      onClick={nextStep}
                      type="button"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      className="flex-1"
                      disabled={isSubmitting}
                      key="submit-button"
                      type="submit"
                    >
                      {isSubmitting ? "Creating account..." : "Create Account"}
                    </Button>
                  )}
                </div>
              </form>
              <div className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
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
      <Dialog
        open={showSuccessDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowSuccessDialog(false);
            router.push(SYSTEM_CONFIG.redirectAfterSignUp);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registration Successful!</DialogTitle>
            <DialogDescription>
              A confirmation email has been sent to verify your email address.
              You can start shopping right away. However, please verify your
              email address within <strong>7 days</strong> to keep your account
              active. If your email is not verified within this period, your
              account will be deactivated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                router.push(SYSTEM_CONFIG.redirectAfterSignUp);
              }}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStepTitle(step: number): string {
  switch (step) {
    case 1:
      return "Account Credentials";
    case 2:
      return "Personal Information";
    case 3:
      return "Address";
    default:
      return "";
  }
}
