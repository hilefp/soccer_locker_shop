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
            Effective April 10, 2025
          </p>
        </div>

        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <section className="mb-8">
            <p className="mt-4 text-muted-foreground">
              Please read these Terms of Use carefully before using MyUniformSoccerLocker.com (&ldquo;Soccer Locker Team Uniforms Site&rdquo;). This website is owned and operated by Soccer Locker Miami (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By accessing, using, registering for, or purchasing from the Soccer Locker Team Uniforms Site, you agree to comply with and be bound by these terms (&ldquo;Terms&rdquo;). If you do not agree to these Terms, please do not use this website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">Eligibility</h2>
            <p className="mt-4 text-muted-foreground">
              The Soccer Locker Team Uniforms Site is intended for use by individuals who are 18 years or older. By using the site, you represent that you are at least 18 years of age. If we discover that you are under 18, we may terminate your access and registration.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">Privacy</h2>
            <p className="mt-4 text-muted-foreground">
              We are committed to protecting your privacy. For details on how we collect and use your information, please refer to our Privacy Policy. By using the site, you agree to the collection and use of information as described in the Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">Changes to the Site</h2>
            <p className="mt-4 text-muted-foreground">
              We reserve the right to modify, update, or discontinue any part of the Soccer Locker Team Uniforms Site at any time, without prior notice. Any new features or modifications to the site are subject to these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">Registration and Account Security</h2>
            <p className="mt-4 text-muted-foreground">
              To access certain features of the Soccer Locker Team Uniforms Site, you may need to create an account by providing a valid email address and creating a password. You are responsible for maintaining the confidentiality of your account information and are liable for any activity under your account. You agree to provide accurate and up-to-date information during registration and to promptly update your details as needed.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">SMS Notifications</h2>
            <p className="mt-4 text-muted-foreground">
              By placing an order on our website, you agree that we may send you order-related updates via SMS to the phone number you provide during checkout. These messages may include order confirmations, shipping updates, delivery notifications, or other transactional alerts related to your purchase. Standard message and data rates may apply.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">Security</h2>
            <p className="mt-4 text-muted-foreground">
              You are responsible for all activities conducted using your account. You agree to notify us immediately at{" "}
              <a href="mailto:teamorder@soccerlocker.com" className="text-primary hover:underline">
                teamorder@soccerlocker.com
              </a>{" "}
              of any unauthorized use of your account. We are not liable for any loss or damage resulting from unauthorized access to your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">License and Restrictions</h2>
            <p className="mt-4 text-muted-foreground">
              Soccer Locker grants you a limited, non-exclusive, non-transferable license to access and make personal use of the Soccer Locker Team Uniforms Site. You are not permitted to:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Reproduce, duplicate, copy, sell, resell, or exploit any part of the site for commercial purposes without our express written consent.</li>
              <li>Use any data mining tools, robots, or similar data gathering and extraction methods.</li>
              <li>Frame or utilize framing techniques to enclose any trademark, logo, or proprietary information without our prior written consent.</li>
              <li>Use any meta tags or &ldquo;hidden text&rdquo; utilizing Soccer Locker&rsquo;s name or trademarks without prior written consent.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">User Content</h2>
            <p className="mt-4 text-muted-foreground">
              You may post, upload, or transmit content (including but not limited to reviews, comments, and other materials) on the Soccer Locker Team Uniforms Site (&ldquo;User Content&rdquo;). By doing so, you grant us a non-exclusive, royalty-free, worldwide license to use, reproduce, and distribute such User Content. You are solely responsible for your User Content and must ensure it does not violate any laws or third-party rights.
            </p>
            <p className="mt-4 text-muted-foreground">
              We reserve the right, but are not obligated, to monitor and remove any User Content that we consider inappropriate, offensive, or in violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">Copyright Infringement</h2>
            <p className="mt-4 text-muted-foreground">
              If you believe that any content on the Soccer Locker Team Uniforms Site infringes your copyright, please provide a written notice to our designated copyright agent at:
            </p>
            <p className="mt-4 text-muted-foreground">
              Soccer Locker Team Department<br />
              ATTN: Copyright Agent<br />
              8810 SW 131st St<br />
              Miami, FL 33176<br />
              Email:{" "}
              <a href="mailto:teamorder@soccerlocker.com" className="text-primary hover:underline">
                teamorder@soccerlocker.com
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">Ownership of Site Content</h2>
            <p className="mt-4 text-muted-foreground">
              The content on the Soccer Locker Team Uniforms Site, including text, graphics, images, logos, and software, is owned by us or our licensors. You are not granted any rights to use our trademarks, logos, or other intellectual property without our prior written consent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">Disclaimer</h2>
            <p className="mt-4 text-muted-foreground">
              The Soccer Locker Team Uniforms Site is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We do not make any representations or warranties of any kind, express or implied, regarding the operation of the site or the information, content, or materials included on the site. You agree that your use of the site is at your sole risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">Indemnity</h2>
            <p className="mt-4 text-muted-foreground">
              You agree to indemnify, defend, and hold Soccer Locker, its affiliates, employees, agents, and representatives harmless from any claims, liabilities, damages, or expenses, including legal fees, arising out of your use of the Soccer Locker Team Uniforms Site, your violation of these Terms, or your violation of any third-party rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">Contact Us</h2>
            <p className="mt-4 text-muted-foreground">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="mt-4 text-muted-foreground">
              Email:{" "}
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
