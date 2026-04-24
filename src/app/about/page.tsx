import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Soccer Locker Miami, established in 1981. Discover our story and passion for the beautiful game.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            About Us
          </h1>
        </div> 

        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-xl font-semibold">
              Kickin&rsquo; It Since &rsquo;81: The Soccer Locker Miami Story
            </h2>
            <p className="mt-4 text-muted-foreground">
              Established in the soccer fever of 1981, Soccer Locker of Miami
              kicked off its journey in a modest six-hundred-square-foot retail
              strip center. As the local love for soccer soared, so did the
              store, expanding to a cool twelve hundred square feet. Fast
              forward to 1994, and with the World Cup frenzy at its peak, Soccer
              Locker made a power move to its current location.
            </p>
            <p className="mt-4 text-muted-foreground">
              Now boasting a sprawling four thousand square feet of retail
              space, Soccer Locker partners with top-notch vendors to showcase
              the latest and greatest soccer gear. Our success story is written
              in the pages of exceptional customer service, a tradition
              we&rsquo;re proud to uphold.
            </p>
            <p className="mt-4 text-muted-foreground">
              Whether you&rsquo;re in the Magic City or browsing online, if you
              need anything soccer-related, we&rsquo;ve got your back. And if
              your travels lead you to Miami, don&rsquo;t forget to swing by and
              experience the Soccer Locker vibe firsthand. Here&rsquo;s to the
              beautiful game, and here&rsquo;s to you&mdash;our fantastic soccer
              community!
            </p>
          </section>

          <section className="mb-8">
            <p className="text-muted-foreground font-semibold">
              David Zighelboim
            </p>
            <p className="text-muted-foreground">President</p>
          </section>
        </div>
      </div>
    </main>
  );
}
