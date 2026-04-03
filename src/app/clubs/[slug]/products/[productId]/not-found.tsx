import Link from "next/link";

import { Button } from "~/ui/primitives/button";

export default function ProductNotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 py-10">
        <div className="container px-4 md:px-6">
          <h1 className="text-3xl font-bold">Product Not Found</h1>
          <p className="mt-4 text-muted-foreground">
            The product you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
