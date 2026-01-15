import { getClubs } from "~/lib/api/clubs";
import { ClubsGrid } from "~/ui/components/clubs-grid";
import { HeroCarousel } from "~/ui/components/hero-carousel";

const carouselSlides = [
  {
    alt: "Soccer Ball - Trionda",
    id: "slide-1",
    imageUrl:
      "https://www.soccerlocker.com/ccms/default/assets/Image/WC-Ball-Trionda.jpg",
    subtitle: "Official Match Balls",
    title: "Premium Soccer Equipment",
  },
  {
    alt: "World Cup 2026 - Adidas",
    id: "slide-2",
    imageUrl:
      "https://www.soccerlocker.com/ccms/default/assets/Image/WC26-adidas.jpg",
    subtitle: "Get Ready for 2026",
    title: "World Cup Collection",
  },
];

export default async function HomePage() {
  const clubs = await getClubs();

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Carousel */}
      <section>
        <HeroCarousel className="h-[35vh] min-h-[300px]" slides={carouselSlides} />
      </section>

      {/* Pick Your Team Section */}
      <section className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="mb-12 flex items-center justify-center">
          <div className="h-px flex-1 bg-border" />
          <h1 className="px-8 text-center text-2xl font-bold uppercase tracking-wide sm:text-3xl md:text-4xl">
            Pick Your Team
          </h1>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Clubs Grid with Search */}
        <ClubsGrid clubs={clubs} />
      </section>
    </main>
  );
}
