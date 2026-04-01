"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearAuth, getUser, type StoredUser } from "@/lib/auth-storage";
import { ShoppingCart, Store, User } from "lucide-react";

export function SiteHeader() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setUser(getUser());
    const onAuth = () => setUser(getUser());
    window.addEventListener("auth-change", onAuth);
    return () => window.removeEventListener("auth-change", onAuth);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Store className="h-5 w-5" />
          MultiVendor
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/" className={cn(buttonVariants({ variant: "ghost" }))}>
            Shop
          </Link>
          {user?.role === "CUSTOMER" && (
            <Link
              href="/cart"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "inline-flex items-center gap-1"
              )}
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
            </Link>
          )}
          {!user && (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Customer
              </Link>
              <Link
                href="/vendor/login"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Vendor
              </Link>
              <Link href="/admin/login" className={cn(buttonVariants({ size: "sm" }))}>
                Admin
              </Link>
            </>
          )}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
              >
                <User className="h-4 w-4" />
                {user.name}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user.role === "SUPER_ADMIN" && (
                  <DropdownMenuItem onClick={() => router.push("/admin/dashboard")}>
                    Admin dashboard
                  </DropdownMenuItem>
                )}
                {user.role === "VENDOR" && (
                  <DropdownMenuItem onClick={() => router.push("/vendor/dashboard")}>
                    Vendor dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    clearAuth();
                    window.location.href = "/";
                  }}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
}
