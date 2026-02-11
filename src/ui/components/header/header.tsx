"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { SEO_CONFIG } from "~/app";
import { useAuth } from "~/lib/hooks/use-auth";
import { cn } from "~/lib/cn";
import { Cart } from "~/ui/components/cart";
import { Button } from "~/ui/primitives/button";
import { Skeleton } from "~/ui/primitives/skeleton";

import { ThemeToggle } from "../theme-toggle";
import { HeaderUserDropdown } from "./header-user";

interface HeaderProps {
  children?: React.ReactNode;
  showAuth?: boolean;
}

export function Header({ showAuth = true }: HeaderProps) {
  const pathname = usePathname();
  const { loading, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
  };

  const mainNavigation = [
    { href: "/", name: "Home" },
    { href: "/teams", name: "Teams" },
    { href: "/track-order", name: "Track Order" },
    { href: "/shipping-returns", name: "Shipping & Returns" },
    { href: "/contact", name: "Contact" },
  ];

  const isDashboard = user && pathname.startsWith("/dashboard");
  const navigation = mainNavigation;

  const renderContent = () => (
    <header
      className={`
        sticky top-0 z-40 w-full border-b border-transparent bg-background/80
        backdrop-blur-sm transition-colors duration-200
        hover:border-border/50
      `}
    >
      <div
        className={`
          container mx-auto max-w-7xl px-4
          sm:px-6
          lg:px-8
        `}
      >
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link className="flex items-center" href="/">
              <Image
                alt="Soccer Locker"
                className="h-10 w-auto"
                height={57}
                priority
                src="/Logo.svg"
                width={157}
              />
            </Link>
            <nav className="hidden md:flex">
              <ul className="flex items-center gap-6">
                {loading
                  ? Array.from({ length: navigation.length }).map((_, i) => (
                      <li key={i}>
                        <Skeleton className="h-5 w-16" />
                      </li>
                    ))
                  : navigation.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/" && pathname?.startsWith(item.href));

                      return (
                        <li key={item.name}>
                          <Link
                            className={cn(
                              "text-sm transition-colors hover:text-foreground",
                              isActive
                                ? "font-medium text-foreground"
                                : "text-muted-foreground"
                            )}
                            href={item.href}
                          >
                            {item.name}
                          </Link>
                        </li>
                      );
                    })}
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {!isDashboard &&
              (loading ? (
                <Skeleton className="h-8 w-8 rounded-full" />
              ) : (
                <Cart />
              ))}

            {loading ? (
              <Skeleton className="h-8 w-8 rounded-full" />
            ) : (
             ""
            )}

            {showAuth && (
              <div className="hidden md:block">
                {user ? (
                  <HeaderUserDropdown
                    isDashboard={!!isDashboard}
                    userEmail={user.email}
                    userImage={user.profile?.avatarUrl}
                    userName={
                      `${user.profile?.firstName || ""} ${
                        user.profile?.lastName || ""
                      }`.trim() || "User"
                    }
                    onLogout={handleLogout}
                  />
                ) : loading ? (
                  <Skeleton className="h-9 w-28" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Link href="/auth/login">
                      <Button size="sm" variant="ghost">
                        Log in
                      </Button>
                    </Link>
                    <Link href="/auth/register">
                      <Button size="sm">Sign up</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {!isDashboard &&
              (loading ? (
                <Skeleton className="h-8 w-8 rounded-full" />
              ) : (
                <ThemeToggle />
              ))}

            {/* Mobile menu button */}
            <Button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              size="icon"
              variant="ghost"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 border-b px-4 py-3">
            {loading
              ? Array.from({ length: navigation.length }).map((_, i) => (
                  <div className="py-2" key={i}>
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))
              : navigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname?.startsWith(item.href));

                  return (
                    <Link
                      className={cn(
                        "block rounded-md px-3 py-2 text-base font-medium",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : `
                            text-foreground
                            hover:bg-muted/50 hover:text-primary
                          `
                      )}
                      href={item.href}
                      key={item.name}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  );
                })}
          </div>

          {showAuth && !user && (
            <div className="space-y-1 border-b px-4 py-3">
              <Link
                className={`
                  block rounded-md px-3 py-2 text-base font-medium
                  hover:bg-muted/50
                `}
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                className={`
                  block rounded-md bg-primary px-3 py-2 text-base font-medium
                  text-primary-foreground
                  hover:bg-primary/90
                `}
                href="/auth/register"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          )}

          {showAuth && user && (
            <div className="space-y-1 border-b px-4 py-3">
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Signed in as {user.email}
              </div>
              <Link
                className={`
                  block rounded-md px-3 py-2 text-base font-medium
                  hover:bg-muted/50
                `}
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <button
                className={`
                  block w-full rounded-md px-3 py-2 text-left text-base font-medium
                  text-destructive
                  hover:bg-destructive/10
                `}
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );

  return renderContent();
}
