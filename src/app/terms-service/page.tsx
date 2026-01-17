import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Soccer Locker terms of service. Read our terms and conditions for using our website and services.",
};

export default function TermsServicePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-muted-foreground">
            Last updated: January 2025
          </p>
        </div>

        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="mt-4 text-muted-foreground">
              By accessing and using Soccer Locker's website and services, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">2. Use of Service</h2>
            <p className="mt-4 text-muted-foreground">
              You agree to use our website and services only for lawful purposes and in accordance with these Terms. You agree not to:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Transmit any viruses or malicious code</li>
              <li>Collect user information without consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">3. Account Registration</h2>
            <p className="mt-4 text-muted-foreground">
              When you create an account, you must provide accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">4. Orders and Payment</h2>
            <p className="mt-4 text-muted-foreground">
              All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order for any reason. Prices are subject to change without notice.
            </p>
            <p className="mt-4 text-muted-foreground">
              Payment must be received before orders are processed. We accept major credit cards and other payment methods as displayed at checkout.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">5. Product Information</h2>
            <p className="mt-4 text-muted-foreground">
              We strive to display accurate product information, including colors and sizing. However, we cannot guarantee that your device's display accurately reflects actual product colors. Minor variations may occur.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">6. Shipping and Delivery</h2>
            <p className="mt-4 text-muted-foreground">
              Shipping times are estimates and not guaranteed. We are not responsible for delays caused by shipping carriers, customs, or circumstances beyond our control. Risk of loss transfers to you upon delivery to the carrier.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">7. Returns and Refunds</h2>
            <p className="mt-4 text-muted-foreground">
              Please refer to our Shipping & Returns page for detailed information about our return policy. Custom and personalized items are non-refundable unless defective.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">8. Intellectual Property</h2>
            <p className="mt-4 text-muted-foreground">
              All content on this website, including text, graphics, logos, images, and software, is the property of Soccer Locker or its licensors and is protected by intellectual property laws. Team logos and names are trademarks of their respective owners and are used with permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">9. Limitation of Liability</h2>
            <p className="mt-4 text-muted-foreground">
              To the fullest extent permitted by law, Soccer Locker shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">10. Indemnification</h2>
            <p className="mt-4 text-muted-foreground">
              You agree to indemnify and hold harmless Soccer Locker and its affiliates from any claims, damages, or expenses arising from your use of our services or violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">11. Changes to Terms</h2>
            <p className="mt-4 text-muted-foreground">
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of our services constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">12. Governing Law</h2>
            <p className="mt-4 text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the State of [State], without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">13. Contact Information</h2>
            <p className="mt-4 text-muted-foreground">
              For questions about these Terms of Service, please contact us at:
            </p>
            <p className="mt-2 text-muted-foreground">
              Email:{" "}
              <a href="mailto:legal@soccerlocker.com" className="text-primary hover:underline">
                legal@soccerlocker.com
              </a>
            </p>
            <p className="mt-1 text-muted-foreground">
              Address: 123 Soccer Street, Sports City, SC 12345
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
