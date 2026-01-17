"use client";

import { useEffect, useState } from "react";

import { ProductModal } from "~/ui/components/product-modal";
import type {
  ClubProduct,
  ClubProductDetail,
  ClubProductFilters,
  ProductCategory,
} from "~/lib/api/types";
import { ClubProductCard } from "~/ui/components/club-product-card";

interface ClubProductsSectionProps {
  clubId: string;
  clubName: string;
  initialProducts: ClubProduct[];
  initialTotal: number;
  categories: ProductCategory[];
}

export function ClubProductsSection({
  clubId,
  clubName,
  initialProducts,
  initialTotal,
  categories,
}: ClubProductsSectionProps) {
  const [products, setProducts] = useState<ClubProduct[]>(initialProducts);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ClubProductDetail | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  const categoryGroups = [
    { id: null, label: "All Products" },
    ...categories.map((cat) => ({ id: cat.id, label: cat.name })),
  ];

  useEffect(() => {
    // Reset to initial products when "All Products" is selected
    if (selectedCategory === null) {
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
          sortBy: "createdAt" as any,
          sortOrder: "desc" as any,
          categoryId: selectedCategory,
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
  }, [selectedCategory, clubId, initialProducts]);

  const displayedProducts = products;

  // Handle product click - fetch details and open modal
  const handleProductClick = async (product: ClubProduct) => {
    setIsLoadingProduct(true);
    setModalOpen(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(
        `${apiUrl}/api/shop/clubs/${clubId}/products/${product.productId}`
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
    const images: string[] = [];
    if (selectedProduct.imageUrls?.length) images.push(...selectedProduct.imageUrls);
    if (selectedProduct.product.imageUrls?.length) images.push(...selectedProduct.product.imageUrls);
    if (selectedProduct.product.imageUrl) images.push(selectedProduct.product.imageUrl);
    return images;
  };

  const activeCategoryLabel =
    categoryGroups.find((cat) => cat.id === selectedCategory)?.label ||
    "All Products";

  return (
    <>
      {/* Category Navigation */}
      <section className="sticky top-20 z-30 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 py-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {categoryGroups.map((category) => (
              <button
                key={category.id || "all"}
                className={`rounded-lg border px-6 py-3.5 text-sm font-medium uppercase tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  selectedCategory === category.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:border-foreground hover:bg-foreground hover:text-background"
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.label}
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
              {activeCategoryLabel}
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
          ) : displayedProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
                  {selectedCategory
                    ? `No products available in this category for ${clubName}`
                    : `No products available for ${clubName} at the moment`}
                </p>
              </div>
            </div>
          )}

          {/* Product Count */}
          {displayedProducts.length > 0 && (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Showing {displayedProducts.length} product{displayedProducts.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </section>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        displayName={getDisplayName()}
        displayImages={getDisplayImages()}
        brandName={selectedProduct?.product.brand.name || ""}
        categoryName={selectedProduct?.product.category.name || ""}
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
