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
                  1 to 2 business weeks during low season 
                </p>
                <p className="mt-1 text-muted-foreground">
                  6 to 8 business weeks during high season (June - November)
                </p>
                {/* <p className="mt-1 text-sm text-muted-foreground">
                  Orders under 2 items: $7.99 flat rate <br />
                  Orders under 2 items: $7.99 flat rate
                </p> */}
              </div>
              {/* <div>
                <h3 className="font-medium">Express Shipping</h3>
                <p className="mt-1 text-muted-foreground">
                  2-3 business days | $14.99
                </p>
              </div> */}
              <div>
                <h3 className="font-medium">Rush Shipping</h3>
                <p className="mt-1 text-muted-foreground">
                  5-7 business days | $100.00
                </p>
                {/* <p className="mt-1 text-sm text-muted-foreground">
                  Orders must be placed before 12:00 PM EST
                </p> */}
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
                No Risk Return/Exchange Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium">Returning New Items</h3>
                <p className="mt-1 text-muted-foreground">
                  All products sold are picked by our staff, players and coaches, making our product selection unique. Here at Soccer Locker Miami we know that sometimes the item that you bought turns out to be different than what you expected. For a full refund for the cost of the item or exchange, the item must be returned in its original condition and if sold as a set (i.e. warm-up pant and jacket) it must be returned as a set.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Exchange Shipping</h3>
                <p className="mt-1 text-muted-foreground">
                  For exchange items, the customer will pay for the shipping charges back to Soccer Locker and we will pay for the shipping back to the customer. Almost all items that have been worn outside (especially shoes) will show signs of wear and will no longer be in original condition, thus it is important to try everything on indoors or we cannot accept or process your return.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Wrong Item Received</h3>
                <p className="mt-1 text-muted-foreground">
                  If we sent you the wrong item in error, we will, of course, pay the shipping costs. We ship all exchange orders back to you for FREE (UPS Ground service) in consideration of our error and the welfare of your business with us.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Return Shipping Address</h3>
                <p className="mt-1 text-muted-foreground">
                  Please ship your return package either UPS or insured US Mail (remember to keep your receipt and tracking number) to:
                </p>
                <address className="mt-2 not-italic text-muted-foreground">
                  Soccer Locker Team Department<br />
                  8810 SW 131st St<br />
                  Miami, FL 33176
                </address>
              </div>
              <div>
                <h3 className="font-medium">Important Notes</h3>
                <p className="mt-1 text-muted-foreground">
                  We cannot accept COD&apos;s or packages marked &quot;Bill Recipient&quot;. Please keep the receipt or tracking number of your returned package in the event it is delayed or lost in transit. All refunds will be for merchandise only; we cannot refund shipping costs unless the item was sent in error.
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
                <a href="mailto:teamorder@soccerlocker.com" className="text-primary hover:underline">
                  teamorder@soccerlocker.com
                </a>{" "}
                or call us at{" "}
                <a href="tel:+7867018057" className="text-primary hover:underline">
                  (786) 701-8057
                </a>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
