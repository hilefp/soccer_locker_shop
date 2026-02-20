"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { apiPost } from "~/lib/api/client";
import type { ConfirmCheckoutResponse } from "~/lib/api/types";
import { useCart } from "~/lib/hooks/use-cart";
import { Button } from "~/ui/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/ui/primitives/card";
import { Separator } from "~/ui/primitives/separator";

export function ConfirmPageClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { clearCart } = useCart();

  const [status, setStatus] = React.useState<
    "confirming" | "success" | "failed"
  >("confirming");
  const [orderData, setOrderData] =
    React.useState<ConfirmCheckoutResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!orderId) {
      setStatus("failed");
      setErrorMessage("No order ID provided.");
      return;
    }

    let cancelled = false;

    async function confirmPayment() {
      try {
        const result = await apiPost<ConfirmCheckoutResponse>(
          "/api/shop/checkout/confirm",
          { orderId },
        );

        if (cancelled) return;

        if (result.status === "NEW" || result.status === "CONFIRMED") {
          setOrderData(result);
          setStatus("success");
          clearCart();
          toast.success("Payment confirmed!");
        } else {
          setStatus("failed");
          setErrorMessage(
            result.message || "Payment could not be verified.",
          );
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("failed");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to confirm payment. Please contact support.",
        );
        console.error("Confirm checkout error:", err);
      }
    }

    void confirmPayment();
    return () => {
      cancelled = true;
    };
  }, [orderId, clearCart]);

  /* ---------------------- Confirming view -------------------------------- */
  if (status === "confirming") {
    return (
      <div className="container mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24 md:px-6">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-medium">Confirming your payment...</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Please wait while we verify your payment with Square.
        </p>
      </div>
    );
  }

  /* ---------------------- Failed view ------------------------------------ */
  if (status === "failed") {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 md:px-6">
        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <XCircle className="mb-4 h-16 w-16 text-destructive" />
            <h2 className="mb-2 text-2xl font-bold">Payment Failed</h2>
            <p className="mb-8 text-muted-foreground">
              {errorMessage || "Something went wrong with your payment."}
            </p>
            <div className="flex gap-4">
              <Link href="/checkout">
                <Button size="lg">Try Again</Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------------------- Success view ----------------------------------- */
  return (
    <div className="container mx-auto max-w-7xl px-4 py-16 md:px-6">
      <Card className="mx-auto max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Order Received!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Thank you for your purchase. You will receive a confirmation email
            shortly.
          </p>

          {orderData && (
            <div className="space-y-4">
              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Order Number</span>
                  <span className="font-medium">
                    #{orderData.orderNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono text-xs">
                    {orderData.orderId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    {orderData.status}
                  </span>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">Total Paid</span>
                  <span className="text-base font-semibold">
                    ${parseFloat(orderData.total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <Link href="/order-status">
              <Button className="w-full" size="lg">
                Track Your Order
              </Button>
            </Link>
            <Link href="/">
              <Button className="w-full" size="lg" variant="outline">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
