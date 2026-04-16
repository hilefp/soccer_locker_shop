"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { apiGet } from "~/lib/api/client";
import { Separator } from "~/ui/primitives/separator";
import { Skeleton } from "~/ui/primitives/skeleton";

interface Catalog {
  id: string;
  brand: string;
  year: number;
  coverImageUrl: string;
  pdfUrl: string;
  sortPosition: number;
}

interface CatalogGroup {
  year: number;
  catalogs: Catalog[];
}

export function CatalogsPageClient() {
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<CatalogGroup[]>("/api/shop/catalogs")
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 py-10">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Page heading */}
          <div className="mb-8 flex items-center gap-4">
            <Separator className="flex-1" />
            <h1 className="whitespace-nowrap text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Team Catalogs
            </h1>
            <Separator className="flex-1" />
          </div>

          {loading ? (
            <div className="space-y-12">
              {[1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className="mx-auto mb-6 h-5 w-16" />
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {[1, 2, 3].map((j) => (
                      <Skeleton
                        className="aspect-3/4 w-full rounded-md"
                        key={j}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No catalogs available at this time.
            </p>
          ) : (
            <div className="space-y-12">
              {groups.map((group) => (
                <section key={group.year}>
                  <h2 className="mb-6 text-center text-lg font-semibold">
                    {group.year}
                  </h2>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {group.catalogs.map((catalog) => (
                      <a
                        className="group relative block overflow-hidden rounded-md shadow-sm transition-shadow hover:shadow-lg"
                        href={catalog.pdfUrl}
                        key={catalog.id}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <Image
                          alt={`${catalog.brand} ${catalog.year} catalog`}
                          className="aspect-3/4 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          height={400}
                          src={catalog.coverImageUrl}
                          width={300}
                        />
                      </a>
                    ))}
                  </div>

                  <Separator className="mt-10" />
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
