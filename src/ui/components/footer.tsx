import { Facebook, Instagram, Mail, Phone, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { SEO_CONFIG } from "~/app";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/primitives/button";

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t bg-background", className)}>
      <div
        className={`
          container mx-auto max-w-7xl px-4 py-12
          sm:px-6
          lg:px-8
        `}
      >
        <div
          className={`
            grid grid-cols-1 gap-8
            md:grid-cols-4
          `}
        >
          <div className="space-y-4">
            <Link className="flex items-center gap-2" href="/">
              <Image
                src="/team-fav.png"
                alt={SEO_CONFIG.name}
                width={40}
                height={40}
                className="rounded"
              />
              <span
                className={`
                  bg-gradient-to-r from-primary to-primary/70 bg-clip-text
                  text-xl font-bold tracking-tight text-transparent
                `}
              >
                {SEO_CONFIG.name}
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Choose your soccer club or academy to view and order your official
              uniforms and fan gear. Click on team logos to shop uniforms for
              each team.
            </p>
            <div className="flex space-x-4">
              <Button
                className="h-8 w-8 rounded-full"
                size="icon"
                variant="ghost"
                asChild
              >
                <a
                  href="https://facebook.com/soccerlocker"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="h-4 w-4" />
                  <span className="sr-only">Facebook</span>
                </a>
              </Button>
              <Button
                className="h-8 w-8 rounded-full"
                size="icon"
                variant="ghost"
                asChild
              >
                <a
                  href="https://twitter.com/soccerlocker"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="h-4 w-4" />
                  <span className="sr-only">Twitter</span>
                </a>
              </Button>
              <Button
                className="h-8 w-8 rounded-full"
                size="icon"
                variant="ghost"
                asChild
              >
                <a
                  href="https://instagram.com/soccerlocker"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="h-4 w-4" />
                  <span className="sr-only">Instagram</span>
                </a>
              </Button>
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  className={`
                    text-muted-foreground
                    hover:text-foreground
                  `}
                  href="/"
                >
                  All Teams
                </Link>
              </li>
              <li>
                <Link
                  className={`
                    text-muted-foreground
                    hover:text-foreground
                  `}
                  href="/?category=uniforms"
                >
                  Uniforms
                </Link>
              </li>
              <li>
                <Link
                  className={`
                    text-muted-foreground
                    hover:text-foreground
                  `}
                  href="/?category=jerseys"
                >
                  Jerseys
                </Link>
              </li>
              <li>
                <Link
                  className={`
                    text-muted-foreground
                    hover:text-foreground
                  `}
                  href="/?category=fan-gear"
                >
                  Fan Gear
                </Link>
              </li>
              <li>
                <Link
                  className={`
                    text-muted-foreground
                    hover:text-foreground
                  `}
                  href="/?category=accessories"
                >
                  Accessories
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  className={`
                    text-muted-foreground
                    hover:text-foreground
                  `}
                  href="/about"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  className={`
                    text-muted-foreground
                    hover:text-foreground
                  `}
                  href="/clubs"
                >
                  Partner Clubs
                </Link>
              </li>
              <li>
                <Link
                  className={`
                    text-muted-foreground
                    hover:text-foreground
                  `}
                  href="/contact"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  className={`
                    text-muted-foreground
                    hover:text-foreground
                  `}
                  href="/contact"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  className={`
                    text-muted-foreground
                    hover:text-foreground
                  `}
                  href="/shipping-returns"
                >
                  Shipping & Returns
                </Link>
              </li>
              <li>
                <Link
                  className={`
                    text-muted-foreground
                    hover:text-foreground
                  `}
                  href="/privacy-policy"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  className={`
                    text-muted-foreground
                    hover:text-foreground
                  `}
                  href="/terms-service"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 border-none pt-1">
          <div
            className={`
              flex flex-col items-center justify-between gap-4
              md:flex-row
            `}
          >
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {SEO_CONFIG.name}. All rights
              reserved.
            </p>
            <div
              className={
                "flex items-center gap-4 text-sm text-muted-foreground"
              }
            >
              <Link className="hover:text-foreground" href="/privacy-policy">
                Privacy
              </Link>
              <Link className="hover:text-foreground" href="/terms-service">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
