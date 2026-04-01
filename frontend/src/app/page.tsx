"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  imageUrl: string | null;
  store: { id: string; name: string; slug: string; vendorName: string };
};

export default function HomePage() {
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      api<{ products: Product[] }>(`/api/products${qs}`)
        .then((d) => setProducts(d.products))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-muted-foreground text-sm">
          Products from many vendors — each card shows the store and seller, similar to Daraz.
        </p>
      </div>
      <Input
        placeholder="Search products..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="flex flex-col overflow-hidden pt-0">
              <div className="bg-muted aspect-[4/3] w-full" />
              <CardHeader className="gap-1">
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary">{p.store.name}</Badge>
                  <span>by {p.store.vendorName}</span>
                </div>
                <h2 className="line-clamp-2 text-base font-semibold leading-snug">{p.name}</h2>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {p.description || "—"}
                </p>
                <p className="mt-2 text-lg font-semibold">${p.price}</p>
                <p className="text-muted-foreground text-xs">Stock: {p.stock}</p>
              </CardContent>
              <CardFooter>
                <Link
                  href={`/product/${p.id}`}
                  className={cn(buttonVariants(), "w-full")}
                >
                  View & add to cart
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      {!loading && products.length === 0 && (
        <p className="text-muted-foreground text-center">No products found.</p>
      )}
    </div>
  );
}
