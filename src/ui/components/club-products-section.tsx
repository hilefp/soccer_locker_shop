"use client";

import { useEffect, useState } from "react";

import { ProductModal } from "~/ui/components/product-modal";
import type {
  ClubPackageSummary,
  ClubProduct,
  ClubProductDetail,
  ClubProductFilters,
} from "~/lib/api/types";
import { ClubPackageCard } from "~/ui/components/club-package-card";
import { ClubProductCard } from "~/ui/components/club-product-card";

interface ClubProductsSectionProps {
  clubId: string;
  clubSlug: string;
  clubName: string;
  initialProducts: ClubProduct[];
  initialTotal: number;
  initialPackages: ClubPackageSummary[];
  tags: string[];
}

export function ClubProductsSection({
  clubId,
  clubSlug,
  clubName,
  initialProducts,
  initialTotal,
  initialPackages,
  tags,
}: ClubProductsSectionProps) {
  const [products, setProducts] = useState<ClubProduct[]>(initialProducts);
  const [selectedTag, setSelectedTag] = useState<string | null>(tags[0] ?? null);
  const [isLoading, setIsLoading] = useState(false);

  const filteredPackages = selectedTag
    ? initialPackages.filter((p) =>
        p.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()),
      )
    : initialPackages;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ClubProductDetail | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  const tagGroups = tags.map((tag) => ({ id: tag, label: tag }));

  useEffect(() => {
    // Reset to initial products when "All Products" is selected
    if (selectedTag === null) {
      setProducts(initialProducts);
      return;
    }

    async function fetchProducts() {
      setIsLoading(true);
      try {
        const filters: ClubProductFilters = {
          page: 1,
          limit: 50,
          isActive: true,
          sortBy: "price" as any,
          sortOrder: "desc" as any,
          tags: selectedTag ?? undefined,
        };

        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const response = await fetch(
          `${apiUrl}/api/shop/clubs/${clubId}/products?${params.toString()}`
        );
        const data = (await response.json()) as { data?: ClubProduct[] };
        setProducts(data.data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [selectedTag, clubId, initialProducts]);

  const displayedProducts = products;

  // Handle product click - fetch details and open modal
  const handleProductClick = async (product: ClubProduct) => {
    setIsLoadingProduct(true);
    setModalOpen(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(
        `${apiUrl}/api/shop/clubs/${clubId}/products/${product.id}`
      );
      const data = (await response.json()) as ClubProductDetail;
      setSelectedProduct(data);
    } catch (error) {
      console.error("Error fetching product details:", error);
      setModalOpen(false);
    } finally {
      setIsLoadingProduct(false);
    }
  };

  // Get display values for modal
  const getDisplayName = () => {
    if (!selectedProduct) return "";
    return selectedProduct.name || selectedProduct.product.name;
  };

  const getDisplayImages = () => {
    if (!selectedProduct) return [];
    // If club product has custom images, use only those
    if (selectedProduct.imageUrls?.length) {
      return selectedProduct.imageUrls;
    }
    // Fall back to base product images
    const images: string[] = [];
    if (selectedProduct.product.imageUrls?.length) images.push(...selectedProduct.product.imageUrls);
    if (selectedProduct.product.imageUrl && !images.includes(selectedProduct.product.imageUrl)) {
      images.push(selectedProduct.product.imageUrl);
    }
    return images;
  };

  const activeTagLabel =
    tagGroups.find((t) => t.id === selectedTag)?.label || tags[0] || "";

  return (
    <>
      {/* Tag Navigation */}
      <section className="border-b border-border/50 bg-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 py-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {tagGroups.map((tag) => (
              <button
                key={tag.id || "all"}
                className={`rounded-lg border px-6 py-3.5 text-sm font-medium uppercase tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  selectedTag === tag.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:border-foreground hover:bg-foreground hover:text-background"
                }`}
                onClick={() => setSelectedTag(tag.id)}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mb-10 flex items-center justify-center">
            <div className="h-px flex-1 bg-border" />
            <h2 className="px-8 text-center text-xl font-bold uppercase tracking-wide">
              {activeTagLabel}
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Products Grid or Empty State */}
          {isLoading ? (
            <div className="flex min-h-[500px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Loading products...
                </p>
              </div>
            </div>
          ) : displayedProducts.length > 0 || filteredPackages.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredPackages.map((pkg) => (
                <ClubPackageCard key={pkg.id} pkg={pkg} clubSlug={clubSlug} />
              ))}
              {displayedProducts.map((product) => (
                <ClubProductCard
                  key={product.id}
                  product={product}
                  onClick={() => handleProductClick(product)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/10">
              <div className="max-w-md space-y-3 text-center">
                <p className="text-lg font-medium">No Products Found</p>
                <p className="text-sm text-muted-foreground">
                  {selectedTag
                    ? `No products available for "${selectedTag}" in ${clubName}`
                    : `No products available for ${clubName} at the moment`}
                </p>
              </div>
            </div>
          )}

          {/* Item Count */}
          {(displayedProducts.length > 0 || filteredPackages.length > 0) && (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Showing {displayedProducts.length + filteredPackages.length} item{displayedProducts.length + filteredPackages.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </section>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        displayName={getDisplayName()}
        displayImages={getDisplayImages()}
        brandName={selectedProduct?.product.brand?.name || ""}
        categoryName={selectedProduct?.product.category?.name || ""}
        clubId={clubId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {/* Loading overlay when fetching product details */}
      {isLoadingProduct && modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-background p-6">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">Loading product...</p>
          </div>
        </div>
      )}
    </>
  );
}
