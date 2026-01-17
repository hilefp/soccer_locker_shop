import type { Metadata } from "next";

import { getClubs } from "~/lib/api/clubs";
import { ClubsGrid } from "~/ui/components/clubs-grid";

export const metadata: Metadata = {
  title: "Teams",
  description: "Browse all soccer clubs and academies. Find your team and shop official uniforms and fan gear.",
};

export default async function TeamsPage() {
  const clubs = await getClubs();

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            All Teams
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose your soccer club or academy below to view and order your
            official uniforms and fan gear.
          </p>
        </div>

        <ClubsGrid clubs={clubs} />
      </div>
    </main>
  );
}
