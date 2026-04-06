import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getClubBySlug, getClubPackageDetail } from "~/lib/api/clubs";
import { PackageClient } from "./client";

interface ClubPackagePageProps {
  params: Promise<{
    slug: string;
    packageId: string;
  }>;
}

export default async function ClubPackagePage({ params }: ClubPackagePageProps) {
  const { slug, packageId } = await params;
  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  const pkg = await getClubPackageDetail(club.id, packageId);

  if (!pkg) {
    notFound();
  }

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
            <Link href={`/clubs/${slug}`} className="hover:text-foreground">
              {club.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{pkg.name}</span>
          </nav>

          <PackageClient pkg={pkg} clubId={club.id} clubSlug={slug} />
        </div>
      </main>
    </div>
  );
}
