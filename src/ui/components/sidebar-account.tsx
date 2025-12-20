"use client";

import {
  BarChart3,
  CreditCard,
  Package,
  Settings,
  Upload,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "~/lib/cn";

const dashboardNavigation = [
  { href: "/dashboard/stats", icon: BarChart3, name: "Stats" },
  { href: "/dashboard/profile", icon: User, name: "Profile" },
  { href: "/dashboard/orders", icon: Package, name: "Orders" },
  { href: "/dashboard/billing", icon: CreditCard, name: "Billing" },
  { href: "/dashboard/settings", icon: Settings, name: "Settings" },
];

export function SidebarAccount() {
  const pathname = usePathname();

  return (
    <aside
      className={`
        w-64
      `}
    >
      <nav className="space-y-1 p-4">
        <div className="mb-4">
          <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </h2>
        </div>
        <ul className="space-y-1">
          {dashboardNavigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  className={cn(
                    `
                      group flex items-center gap-3 rounded-lg px-3 py-2 text-sm
                      font-medium transition-all
                      hover:bg-accent
                    `,
                    isActive
                      ? "bg-accent text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  href={item.href}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive
                        ? "text-primary"
                        : `
                          text-muted-foreground
                          group-hover:text-foreground
                        `
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
