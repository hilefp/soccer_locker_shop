import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "~/ui/primitives/button";

export default function ClubNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="mt-4 text-2xl font-semibold">Club Not Found</h2>
        <p className="mt-2 text-muted-foreground">
          The club you're looking for doesn't exist or has been removed.
        </p>
        <div className="mt-8">
          <Link href="/">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
