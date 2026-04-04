import { Mail } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";

import { getClubBySlug, getClubPackages, getClubProducts, getClubProductTags } from "~/lib/api/clubs";
import { ClubProductsSection } from "~/ui/components/club-products-section";

interface ClubPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  const id = club.id;

  // Fetch initial products and packages in parallel
  const [productsData, packages, productTags] = await Promise.all([
    getClubProducts(id, {
      page: 1,
      limit: 50,
      isActive: true,
      sortBy: "price" as any,
      sortOrder: "desc" as any,
    }),
    getClubPackages(id),
    getClubProductTags(id),
  ]);

  // Merge product tags with package tags — deduplicate case-insensitively
  const seen = new Set<string>();
  const tags = [...productTags, ...packages.flatMap((p) => p.tags)].filter((tag) => {
    const lower = tag.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  const clubLogo = club.iconBrandShopUrl || club.logoUrl || club.imageUrl;
  const clubCover = club.imageUrl;
  const clubEmail = club.email || club.personInChargeEmail;

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-background py-20 md:py-32">
        {/* Cover Image Background */}
        {clubCover && (
          <>
            <Image
              alt=""
              className="object-cover"
              fill
              priority
              sizes="100vw"
              src={clubCover}
            />
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}
        <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-6 text-center">
            {/* Club Logo */}
            {clubLogo && (
              <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-border bg-background shadow-lg transition-transform hover:scale-105 md:h-40 md:w-40">
                <Image
                  alt={club.name}
                  className="object-contain p-4"
                  fill
                  priority
                  sizes="(max-width: 768px) 128px, 160px"
                  src={clubLogo}
                />
              </div>
            )}

            {/* Club Name */}
            <div className="space-y-2">
              <h1 className={`text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl ${clubCover ? "text-white" : ""}`}>
                {club.name}
              </h1>
              {club.descriptionShop && (
                <p className={`max-w-2xl text-base md:text-lg ${clubCover ? "text-white/80" : "text-muted-foreground"}`}>
                  {club.descriptionShop}
                </p>
              )}
            </div>

            {/* Contact Info */}
            {clubEmail && (
              <a
                className={`flex items-center gap-2 text-sm transition-colors ${clubCover ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
                href={`mailto:${clubEmail}`}
              >
                <Mail className="h-4 w-4" />
                <span>Contact: {clubEmail}</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Products Section with Categories */}
      <ClubProductsSection
        tags={tags}
        clubId={id}
        clubSlug={slug}
        clubName={club.name}
        initialProducts={productsData.data}
        initialTotal={productsData.meta.total}
        initialPackages={packages}
      />
    </main>
  );
}
