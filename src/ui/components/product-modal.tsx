"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import * as React from "react";
import { toast } from "sonner";

import type { ClubProductDetail, ProductVariant } from "~/lib/api/types";
import { useCart } from "~/lib/hooks/use-cart";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/primitives/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/ui/primitives/sheet";

interface ProductModalProps {
  product: ClubProductDetail | null;
  displayName: string;
  displayImages: string[];
  brandName: string;
  categoryName: string;
  clubId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductModal({
  product,
  displayName,
  displayImages,
  brandName,
  categoryName,
  clubId,
  open,
  onOpenChange,
}: ProductModalProps) {
  const { addItem } = useCart();
  const { resolvedTheme } = useTheme();

  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const [quantity, setQuantity] = React.useState(1);
  const [isAdding, setIsAdding] = React.useState(false);

  // Dark mode logo
  const logoSrc = resolvedTheme === "dark"
    ? "/soccerlocker-team-logo-black.png"
    : "/soccerlocker-team-logo.png";

  // Reset state when modal opens with new product
  React.useEffect(() => {
    if (open) {
      setSelectedVariant(null);
      setSelectedImageIndex(0);
      setQuantity(1);
    }
  }, [open, product?.id]);

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

  // Handle variant selection from select
  const handleVariantChange = (sizeType: string, variantId: string) => {
    const variant = variantsByType[sizeType]?.find((v) => v.id === variantId);
    if (variant) {
      setSelectedVariant(variant);
    }
  };

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
    onOpenChange(false);
  }, [addItem, product, selectedVariant, displayName, displayImages, categoryName, quantity, onOpenChange]);

  if (!product) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} >
      <SheetContent
        side="right"
        className="w-full sm:w-[50vw] sm:max-w-[50vw] lg:w-[40vw] lg:max-w-[40vw] p-0 overflow-hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{displayName}</SheetTitle>
        </SheetHeader>

        <div className="flex h-full flex-col overflow-y-auto">
          {/* Image Section */}
          <div className="relative flex flex-col bg-muted/30 p-6">
            {/* Logo */}
            <div className="mb-4">
              <Image
                alt="Soccer Locker"
                src={logoSrc}
                width={120}
                height={32}
                className="object-contain"
              />
            </div>

            {/* Main Image */}
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-background">
              {displayImages[selectedImageIndex] ? (
                <Image
                  alt={displayName}
                  className="object-contain"
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, 40vw"
                  src={displayImages[selectedImageIndex]}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-muted-foreground">No Image</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {displayImages.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {displayImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      "relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border-2 bg-background transition-all",
                      selectedImageIndex === index
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-muted-foreground/50"
                    )}
                  >
                    <Image
                      alt={`${displayName} thumbnail ${index + 1}`}
                      className="object-cover"
                      fill
                      sizes="56px"
                      src={image}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-1 flex-col p-6">
            {/* Brand */}
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {brandName}
            </p>

            {/* Product Name */}
            <h2 className="mt-1 text-xl font-bold lg:text-2xl">{displayName}</h2>

            {/* Price */}
            <div className="mt-3">
              <span className="text-2xl font-bold text-primary">{product.price}</span>
            </div>

            {/* Category */}
            <p className="mt-1 text-sm text-muted-foreground">{categoryName}</p>

            {/* Description */}
            {product.description && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {product.description}
              </p>
            )}

            {/* Size Selector - Using Select */}
            {sizeTypes.length > 0 && (
              <div className="mt-5 space-y-3">
                {sizeTypes.map((type) => (
                  <div key={type}>
                    <label
                      htmlFor={`size-${type}`}
                      className="text-xs font-semibold uppercase tracking-wider"
                    >
                      {type}
                    </label>
                    <select
                      id={`size-${type}`}
                      value={
                        selectedVariant?.attributes["Size Type"] === type ||
                        (!selectedVariant?.attributes["Size Type"] && type === "Standard")
                          ? selectedVariant?.id || ""
                          : ""
                      }
                      onChange={(e) => handleVariantChange(type, e.target.value)}
                      className={cn(
                        "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    >
                      <option value="">Select size</option>
                      {variantsByType[type].map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.attributes["Size"]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mt-5">
              <span className="text-xs font-semibold uppercase tracking-wider">Quantity</span>
              <div className="mt-1.5 flex items-center gap-2">
                <Button
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  size="icon"
                  variant="outline"
                  className="h-9 w-9"
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <span className="w-10 text-center select-none text-base font-semibold">{quantity}</span>

                <Button
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => q + 1)}
                  size="icon"
                  variant="outline"
                  className="h-9 w-9"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1 min-h-4" />

            {/* Add to Cart Button */}
            <div className="mt-6 pb-2">
              <Button
                className="w-full h-12 text-base font-semibold"
                disabled={!selectedVariant || isAdding}
                onClick={handleAddToCart}
                size="lg"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {isAdding ? "Adding..." : "Add to Bag"}
              </Button>

              {!selectedVariant && sizeTypes.length > 0 && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Please select a size to add to cart
                </p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
