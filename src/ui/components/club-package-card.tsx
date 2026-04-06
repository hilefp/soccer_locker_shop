import { Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { ClubPackageSummary } from "~/lib/api/types";
import { cn } from "~/lib/cn";

interface ClubPackageCardProps {
  pkg: ClubPackageSummary;
  clubSlug: string;
}

export function ClubPackageCard({ pkg, clubSlug }: ClubPackageCardProps) {
  const displayImage = pkg.imageUrls?.[0];

  return (
    <Link
      href={`/clubs/${clubSlug}/packages/${pkg.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-background text-left",
        "transition-all duration-300 hover:shadow-lg hover:border-primary/30",
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted/20">
        {displayImage ? (
          <Image
            alt={pkg.name}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            src={displayImage}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Package Badge */}
        <div className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          Package
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 text-xs text-muted-foreground">
          {pkg.itemCount} item{pkg.itemCount !== 1 ? "s" : ""}
        </div>

        <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-tight">
          {pkg.name}
        </h3>

        {pkg.description && (
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
            {pkg.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold">${pkg.price.toFixed(2)}</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">View</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
