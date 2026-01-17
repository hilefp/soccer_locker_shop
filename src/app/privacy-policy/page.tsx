import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Soccer Locker privacy policy. Learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-muted-foreground">
            Last updated: January 2025
          </p>
        </div>

        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className="mt-4 text-muted-foreground">
              Soccer Locker ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and make purchases from our online store.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>
            <p className="mt-4 text-muted-foreground">
              We collect information you provide directly to us, including:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Name, email address, phone number, and shipping address</li>
              <li>Payment information (processed securely through our payment providers)</li>
              <li>Account credentials when you create an account</li>
              <li>Order history and preferences</li>
              <li>Communications you send to us</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
            <p className="mt-4 text-muted-foreground">
              We use the information we collect to:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Process and fulfill your orders</li>
              <li>Send order confirmations and shipping updates</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Send promotional communications (with your consent)</li>
              <li>Improve our website and services</li>
              <li>Prevent fraud and ensure security</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">4. Information Sharing</h2>
            <p className="mt-4 text-muted-foreground">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Service providers who assist in our operations (shipping, payment processing)</li>
              <li>Partner clubs and academies for order fulfillment purposes</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">5. Cookies and Tracking</h2>
            <p className="mt-4 text-muted-foreground">
              We use cookies and similar technologies to enhance your browsing experience, analyze website traffic, and personalize content. You can manage cookie preferences through your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">6. Data Security</h2>
            <p className="mt-4 text-muted-foreground">
              We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">7. Your Rights</h2>
            <p className="mt-4 text-muted-foreground">
              You have the right to:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Access and update your personal information</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of marketing communications</li>
              <li>Request a copy of your data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">8. Children's Privacy</h2>
            <p className="mt-4 text-muted-foreground">
              Our website is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">9. Changes to This Policy</h2>
            <p className="mt-4 text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">10. Contact Us</h2>
            <p className="mt-4 text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2 text-muted-foreground">
              Email:{" "}
              <a href="mailto:privacy@soccerlocker.com" className="text-primary hover:underline">
                privacy@soccerlocker.com
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
