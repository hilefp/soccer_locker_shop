"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { Club } from "~/lib/api/types";
import { Input } from "~/ui/primitives/input";

import { ClubCard } from "./club-card";

interface ClubsGridProps {
  clubs: Club[];
}

export function ClubsGrid({ clubs }: ClubsGridProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClubs = useMemo(() => {
    if (!searchQuery.trim()) {
      return clubs;
    }

    const query = searchQuery.toLowerCase();
    return clubs.filter((club) => {
      const searchableText = [
        club.name,
        club.description,
        club.city,
        club.state,
        club.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [clubs, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="mx-auto max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-10 text-base"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams..."
            type="text"
            value={searchQuery}
          />
        </div>
      </div>

      {/* Clubs Grid */}
      {filteredClubs.length > 0 ? (
        <div
          className={`
            grid grid-cols-2 gap-4
            sm:grid-cols-3 sm:gap-6
            md:grid-cols-4
            lg:grid-cols-5
            xl:grid-cols-6
          `}
        >
          {filteredClubs.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center">
          <p className="text-lg text-muted-foreground">
            {searchQuery
              ? "No teams found matching your search."
              : "No clubs available at the moment."}
          </p>
        </div>
      )}
    </div>
  );
}
