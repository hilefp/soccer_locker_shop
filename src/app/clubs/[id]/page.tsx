import { Mail } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";

import { getClubById, getClubProducts } from "~/lib/api/clubs";
import type { ProductCategory } from "~/lib/api/types";
import { ClubProductsSection } from "~/ui/components/club-products-section";

interface ClubPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ClubPage({ params }: ClubPageProps) {
  const { id } = await params;
  const club = await getClubById(id);

  if (!club) {
    notFound();
  }

  // Fetch initial products
  const productsData = await getClubProducts(id, {
    page: 1,
    limit: 50,
    isActive: true,
    sortBy: "createdAt" as any,
    sortOrder: "desc" as any,
  });


  // Extract unique categories from products
  const categoriesMap = new Map<string, ProductCategory>();
  productsData.data.forEach((clubProduct) => {
    const category = clubProduct.product.category;
    if (!categoriesMap.has(category.id)) {
      categoriesMap.set(category.id, category);
    }
  });
  const categories = Array.from(categoriesMap.values());

  const clubLogo = club.iconBrandShopUrl || club.logoUrl || club.imageUrl;
  const clubEmail = club.email || club.personInChargeEmail;

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-background py-20 md:py-32">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                {club.name}
              </h1>
              {club.descriptionShop && (
                <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                  {club.descriptionShop}
                </p>
              )}
            </div>

            {/* Contact Info */}
            {clubEmail && (
              <a
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
        categories={categories}
        clubId={id}
        clubName={club.name}
        initialProducts={productsData.data}
        initialTotal={productsData.meta.total}
      />
    </main>
  );
}
