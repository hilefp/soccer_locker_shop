"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { toast } from "sonner";

import type { ClubProductDetail, ProductVariant } from "~/lib/api/types";
import { useCart } from "~/lib/hooks/use-cart";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/primitives/button";

interface ClubProductClientProps {
  product: ClubProductDetail;
  displayName: string;
  displayImages: string[];
  brandName: string;
  categoryName: string;
  clubId: string;
}

export function ClubProductClient({
  product,
  displayName,
  displayImages,
  brandName,
  categoryName,
  clubId,
}: ClubProductClientProps) {
  const { addItem } = useCart();

  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const [quantity, setQuantity] = React.useState(1);
  const [isAdding, setIsAdding] = React.useState(false);

  // Group variants by Size Type
  const variantsByType = React.useMemo(() => {
    if (!product?.product.variants) return {};
    return product.product.variants.reduce((acc, variant) => {
      const sizeType = variant.attributes["Size Type"] || "Standard";
      if (!acc[sizeType]) acc[sizeType] = [];
      acc[sizeType].push(variant);
      return acc;
    }, {} as Record<string, ProductVariant[]>);
  }, [product]);

  const sizeTypes = Object.keys(variantsByType);

  // Handle add to cart
  const handleAddToCart = React.useCallback(async () => {
    if (!product || !selectedVariant) return;

    setIsAdding(true);
    const sizeType = selectedVariant.attributes["Size Type"];
    const size = selectedVariant.attributes["Size"];
    const sizeLabel = sizeType ? `${sizeType} ${size}` : size;

    addItem(
      {
        id: `${product.id}-${selectedVariant.id}`,
        name: `${displayName} - ${sizeLabel}`,
        price: parseFloat(product.price.replace(/[^0-9.]/g, "")),
        image: displayImages[0] || "",
        category: categoryName,
      },
      quantity
    );
    toast.success(`${displayName} added to cart`);
    await new Promise((r) => setTimeout(r, 400));
    setIsAdding(false);
  }, [addItem, product, selectedVariant, displayName, displayImages, categoryName, quantity]);

  return (
    <>
      {/* Image Gallery */}
      <div className="flex gap-4">
        {/* Thumbnails */}
        {displayImages.length > 1 && (
          <div className="flex flex-col gap-2">
            {displayImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={cn(
                  "relative h-20 w-20 overflow-hidden rounded-lg border-2 bg-muted transition-all",
                  selectedImageIndex === index
                    ? "border-primary"
                    : "border-transparent hover:border-muted-foreground/50"
                )}
              >
                <Image
                  alt={`${displayName} thumbnail ${index + 1}`}
                  className="object-cover"
                  fill
                  sizes="80px"
                  src={image}
                />
              </button>
            ))}
          </div>
        )}

        {/* Main Image */}
        <div className="relative flex-1 aspect-square overflow-hidden rounded-lg bg-muted">
          {displayImages[selectedImageIndex] ? (
            <Image
              alt={displayName}
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              src={displayImages[selectedImageIndex]}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-muted-foreground">No Image</span>
            </div>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="flex flex-col">
        {/* Brand */}
        <p className="text-lg font-semibold">{brandName}</p>

        {/* Product Name */}
        <h1 className="mt-1 text-xl text-muted-foreground">{displayName}</h1>

        {/* Price */}
        <div className="mt-4">
          <span className="text-2xl font-bold text-primary">{product.price}</span>
        </div>

        {/* Category */}
        <p className="mt-2 text-sm text-muted-foreground">{categoryName}</p>

        {/* Description */}
        {product.description && (
          <p className="mt-4 text-muted-foreground">{product.description}</p>
        )}

        {/* Size Selector */}
        {sizeTypes.length > 0 && (
          <div className="mt-6 space-y-4">
            {sizeTypes.map((type) => (
              <div key={type}>
                <span className="text-sm font-medium text-muted-foreground">{type}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {variantsByType[type].map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={cn(
                        "min-w-[3rem] rounded-md border px-3 py-2 text-sm font-medium transition-all",
                        selectedVariant?.id === variant.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary hover:bg-accent"
                      )}
                    >
                      {variant.attributes["Size"]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quantity Selector */}
        <div className="mt-6">
          <span className="text-sm font-medium">Quantity</span>
          <div className="mt-2 flex items-center gap-2">
            <Button
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              size="icon"
              variant="outline"
            >
              <Minus className="h-4 w-4" />
            </Button>

            <span className="w-12 text-center select-none">{quantity}</span>

            <Button
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => q + 1)}
              size="icon"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Add to Cart Button */}
        <div className="mt-6 flex gap-3">
          <Button
            className="flex-1"
            disabled={!selectedVariant || isAdding}
            onClick={handleAddToCart}
            size="lg"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {isAdding ? "Adding..." : "Add to Bag"}
          </Button>
        </div>

        {!selectedVariant && sizeTypes.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Please select a size to add to cart
          </p>
        )}
      </div>
    </>
  );
}
