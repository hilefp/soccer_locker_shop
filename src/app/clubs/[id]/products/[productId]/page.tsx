import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getClubProduct } from "~/lib/api/clubs";
import { ClubProductClient } from "./client";

interface ClubProductPageProps {
  params: Promise<{
    id: string;
    productId: string;
  }>;
}

export default async function ClubProductPage({ params }: ClubProductPageProps) {
  const { id, productId } = await params;
  const product = await getClubProduct(id, productId);

  if (!product) {
    notFound();
  }

  const displayName = product.name || product.product.name;
  const displayImages: string[] = [];
  if (product.imageUrls?.length) displayImages.push(...product.imageUrls);
  if (product.product.imageUrls?.length) displayImages.push(...product.product.imageUrls);
  if (product.product.imageUrl) displayImages.push(product.product.imageUrl);

  const brandName = product.product.brand.name;
  const categoryName = product.product.category.name;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 py-6 md:py-10">
        <div className="container max-w-7xl px-4 md:px-6">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/clubs/${id}`} className="hover:text-foreground">
              Club
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{displayName}</span>
          </nav>

          {/* Main grid */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Image Gallery - Client Component for interactivity */}
            <ClubProductClient
              product={product}
              displayName={displayName}
              displayImages={displayImages}
              brandName={brandName}
              categoryName={categoryName}
              clubId={id}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
