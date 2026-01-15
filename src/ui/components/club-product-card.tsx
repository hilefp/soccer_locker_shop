import { ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { ClubProduct } from "~/lib/api/types";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/primitives/button";

interface ClubProductCardProps {
  product: ClubProduct;
}

export function ClubProductCard({ product }: ClubProductCardProps) {
  const displayName = product.name || product.product.name;
  const displayImage =
    product.imageUrls?.[0] ||
    product.product.imageUrls?.[0] ||
    product.product.imageUrl;
  const brandLogo = product.brandLogoUrl || product.product.brand.imageUrl;
  const productUrl = `/clubs/${product.clubId}/products/${product.productId}`;

  return (
    <Link
      href={productUrl}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-background",
        "transition-all duration-300 hover:shadow-lg hover:border-primary/30"
      )}
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-muted/20">
        {displayImage ? (
          <Image
            alt={displayName}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            src={displayImage}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-muted-foreground">No Image</span>
          </div>
        )}

        {/* Brand Logo Overlay */}
        {brandLogo && (
          <div className="absolute right-2 top-2 h-8 w-8 overflow-hidden rounded-full bg-background/90 p-1 shadow-sm">
            <div className="relative h-full w-full">
              <Image
                alt={product.product.brand.name}
                className="object-contain"
                fill
                sizes="32px"
                src={brandLogo}
              />
            </div>
          </div>
        )}

      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category & Brand */}
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{product.product.category.name}</span>
          <span>•</span>
          <span>{product.product.brand.name}</span>
        </div>

        {/* Product Name */}
        <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-tight">
          {displayName}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
            {product.description}
          </p>
        )}

        {/* Price & Actions */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <span className="text-lg font-bold">{product.price}</span>
          </div>

          <Button
            size="sm"
            className="gap-1.5"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>
    </Link>
  );
}
