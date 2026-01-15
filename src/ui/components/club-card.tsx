import Image from "next/image";
import Link from "next/link";

import type { Club } from "~/lib/api/types";
import { cn } from "~/lib/cn";

interface ClubCardProps {
  club: Club;
}

export function ClubCard({ club }: ClubCardProps) {
  // Use iconBrandShopUrl if available, otherwise fall back to logoUrl or imageUrl
  const clubImage =
    club.iconBrandShopUrl || club.logoUrl || club.imageUrl || null;
  const clubName = club.name;

  return (
    <Link
      className={cn(
        "group relative flex items-center justify-center",
        "aspect-square w-full overflow-hidden rounded-2xl",
        "bg-background border border-border/50",
        "transition-all duration-300 hover:scale-105",
        "hover:shadow-xl hover:border-primary/30",
      )}
      href={`/clubs/${club.id}`}
    >
      <div className="relative h-full w-full p-6">
        {clubImage ? (
          <Image
            alt={clubName}
            className="object-contain"
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
            src={clubImage}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-center font-medium text-muted-foreground">
              {clubName}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
