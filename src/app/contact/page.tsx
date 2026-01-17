import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Soccer Locker. We're here to help with your uniform and fan gear orders.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Contact Us
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Have questions about your order or need help finding the right gear?
            We're here to help!
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                For general inquiries and support:
              </p>
              <a
                href="mailto:info@soccerlocker.com"
                className="mt-2 block font-medium text-primary hover:underline"
              >
                info@soccerlocker.com
              </a>
              <p className="mt-4 text-muted-foreground">
                For team orders and bulk pricing:
              </p>
              <a
                href="mailto:teams@soccerlocker.com"
                className="mt-2 block font-medium text-primary hover:underline"
              >
                teams@soccerlocker.com
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Call Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Monday - Friday: 9:00 AM - 6:00 PM EST
              </p>
              <a
                href="tel:+1234567890"
                className="mt-2 block font-medium text-primary hover:underline"
              >
                (123) 456-7890
              </a>
              <p className="mt-4 text-muted-foreground">
                Saturday: 10:00 AM - 4:00 PM EST
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sunday: Closed
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Visit Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Soccer Locker Team Shop
              </p>
              <p className="mt-2 font-medium">
                123 Soccer Street<br />
                Sports City, SC 12345<br />
                United States
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Store Hours: Monday - Saturday 10:00 AM - 7:00 PM
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium">How do I place a team order?</h3>
                <p className="mt-1 text-muted-foreground">
                  Select your team from our homepage, browse available products, and add items to your cart. For bulk orders, contact us at teams@soccerlocker.com for special pricing.
                </p>
              </div>
              <div>
                <h3 className="font-medium">What sizes are available?</h3>
                <p className="mt-1 text-muted-foreground">
                  We offer youth sizes (YXS-YXL) and adult sizes (S-3XL) for most products. Check our Size Guide for detailed measurements.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Can I customize my order?</h3>
                <p className="mt-1 text-muted-foreground">
                  Yes! Many of our products can be customized with player names and numbers. Look for the customization options on product pages.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
