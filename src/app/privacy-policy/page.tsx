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
            Effective Date: October 1, 2021
          </p>
        </div>

        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <section className="mb-8">
            <p className="mt-4 text-muted-foreground">
              Welcome to MyUniformSoccerLocker.com (&ldquo;Soccer Locker Team Uniforms Site&rdquo;), owned and operated by Soccer Locker Miami (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). This Privacy Policy explains how we collect, use, and share your personal information when you visit or make a purchase from our site. By using this website, you consent to the practices described in this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p className="mt-4 text-muted-foreground">
              We may collect various types of information, including:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              <li><strong>Personal Information:</strong> When you create an account, place an order, or contact us, we collect personal information such as your name, email address, billing and shipping addresses, phone number, and payment details.</li>
              <li><strong>Usage Information:</strong> We collect information about how you interact with our site, including your IP address, browser type, browsing actions, and device information.</li>
              <li><strong>Cookies and Tracking Technologies:</strong> We use cookies and similar technologies to collect information about your browsing activities, which helps us enhance your user experience.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
            <p className="mt-4 text-muted-foreground">
              We use your information for the following purposes:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              <li><strong>To Provide Services:</strong> To process and fulfill your orders, respond to inquiries, and manage your account.</li>
              <li><strong>To Communicate with You:</strong> We use your contact information to send order confirmations, respond to customer service requests, and provide updates on new products or special offers.</li>
              <li><strong>To Improve Our Site:</strong> We analyze usage information to improve the functionality and performance of our website, including personalizing your experience.</li>
              <li><strong>Marketing:</strong> With your consent, we may send you promotional materials and newsletters. You can opt-out at any time by following the instructions in our emails.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">3. Sharing Your Information</h2>
            <p className="mt-4 text-muted-foreground">
              We may share your information in the following circumstances:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              <li><strong>Service Providers:</strong> We share personal information with third-party service providers that perform services on our behalf, such as payment processing, order fulfillment, and marketing assistance.</li>
              <li><strong>Legal Compliance:</strong> We may disclose your information if required by law, to protect our rights, or to comply with a judicial proceeding, court order, or legal process.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">4. Your Rights</h2>
            <p className="mt-4 text-muted-foreground">
              You have certain rights regarding your personal information:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              <li><strong>Access and Correction:</strong> You may access, update, or correct your personal information by logging into your account or contacting us directly.</li>
              <li><strong>Deletion:</strong> You may request that we delete your personal information, subject to legal or regulatory requirements.</li>
              <li><strong>Opt-Out:</strong> You may opt-out of receiving promotional emails by following the unsubscribe instructions in our emails.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">5. Cookies and Tracking Technologies</h2>
            <p className="mt-4 text-muted-foreground">
              We may use cookies and similar technologies to improve your browsing experience and analyze site usage. Cookies are small data files that a website stores on your device. You can control the use of cookies by adjusting your browser settings, but some features of our site may not function properly if cookies are disabled.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">6. Data Security</h2>
            <p className="mt-4 text-muted-foreground">
              We implement reasonable security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of data transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">7. Children&rsquo;s Privacy</h2>
            <p className="mt-4 text-muted-foreground">
              The Soccer Locker Team Uniforms Site is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we learn that we have collected such information, we will take steps to delete it promptly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">8. Changes to This Privacy Policy</h2>
            <p className="mt-4 text-muted-foreground">
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. The updated version will be posted on our website with the new effective date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">9. Contact Us</h2>
            <p className="mt-4 text-muted-foreground">
              If you have any questions or concerns about our privacy practices, please contact us at:
            </p>
            <p className="mt-4 text-muted-foreground">
              E-mail:{" "}
              <a href="mailto:teamorder@soccerlocker.com" className="text-primary hover:underline">
                teamorder@soccerlocker.com
              </a>
            </p>
            <p className="mt-4 text-muted-foreground">
              Soccer Locker Team Department<br />
              8810 SW 131st St<br />
              Miami, FL 33176
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
