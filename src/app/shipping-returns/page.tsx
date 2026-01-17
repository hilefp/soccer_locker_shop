import type { Metadata } from "next";
import { Package, RotateCcw, Truck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description: "Learn about Soccer Locker shipping options, delivery times, and return policy for uniforms and fan gear.",
};

export default function ShippingReturnsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Shipping & Returns
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know about getting your gear delivered and our hassle-free return policy.
          </p>
        </div>

        <div className="space-y-8">
          <Card className="shadow-none border-none" >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium">Standard Shipping</h3>
                <p className="mt-1 text-muted-foreground">
                  5-7 business days | Free on orders over $75
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Orders under $75: $7.99 flat rate
                </p>
              </div>
              <div>
                <h3 className="font-medium">Express Shipping</h3>
                <p className="mt-1 text-muted-foreground">
                  2-3 business days | $14.99
                </p>
              </div>
              <div>
                <h3 className="font-medium">Rush Shipping</h3>
                <p className="mt-1 text-muted-foreground">
                  1-2 business days | $24.99
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Orders must be placed before 12:00 PM EST
                </p>
              </div>
              <div>
                <h3 className="font-medium">Team Orders</h3>
                <p className="mt-1 text-muted-foreground">
                  Bulk team orders typically ship within 2-3 weeks. Custom orders may require additional processing time. Contact us for specific delivery estimates.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Order Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Once your order ships, you'll receive an email with tracking information. You can also track your order anytime by visiting the <strong>Track Order</strong> page in our navigation menu.
              </p>
              <p className="mt-4 text-muted-foreground">
                Please allow 24-48 hours for tracking information to update after shipment.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-none border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                Returns & Exchanges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium">Return Policy</h3>
                <p className="mt-1 text-muted-foreground">
                  We accept returns within 30 days of delivery for unworn, unwashed items with original tags attached.
                </p>
              </div>
              <div>
                <h3 className="font-medium">How to Return</h3>
                <ol className="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground">
                  <li>Log into your account and go to Order History</li>
                  <li>Select the item(s) you wish to return</li>
                  <li>Print the prepaid return label</li>
                  <li>Pack items securely and drop off at any carrier location</li>
                </ol>
              </div>
              <div>
                <h3 className="font-medium">Exchanges</h3>
                <p className="mt-1 text-muted-foreground">
                  Need a different size? We offer free exchanges for size-related issues. Simply initiate a return and place a new order for the correct size.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Custom & Personalized Items</h3>
                <p className="mt-1 text-muted-foreground">
                  Custom items with names, numbers, or other personalization cannot be returned or exchanged unless there is a manufacturing defect.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Refund Processing</h3>
                <p className="mt-1 text-muted-foreground">
                  Refunds are processed within 5-7 business days of receiving your return. The refund will be credited to your original payment method.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-none">
            <CardHeader>
              <CardTitle>Questions?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                If you have any questions about shipping or returns, please contact our customer service team at{" "}
                <a href="mailto:info@soccerlocker.com" className="text-primary hover:underline">
                  info@soccerlocker.com
                </a>{" "}
                or call us at{" "}
                <a href="tel:+1234567890" className="text-primary hover:underline">
                  (123) 456-7890
                </a>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
