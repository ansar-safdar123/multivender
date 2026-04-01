"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth-storage";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type ProductDetail = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  imageUrl: string | null;
  store: { id: string; name: string; vendorName: string };
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ product: ProductDetail }>(`/api/products/${id}`)
      .then((d) => setProduct(d.product))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function addToCart() {
    const user = getUser();
    const token = getToken();
    if (!user || user.role !== "CUSTOMER" || !token) {
      toast.error("Please log in as a customer to add items to your cart.");
      router.push("/login");
      return;
    }
    try {
      await api("/api/cart/items", {
        method: "POST",
        token,
        body: JSON.stringify({ productId: id, quantity: qty }),
      });
      toast.success("Added to cart");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <p>
        Product not found. <Link href="/">Back to shop</Link>
      </p>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="bg-muted aspect-square w-full rounded-xl" />
      <Card>
        <CardHeader className="gap-2">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            <Badge>{product.store.name}</Badge>
            <span>Sold by {product.store.vendorName}</span>
          </div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{product.description || "No description."}</p>
          <p className="text-2xl font-semibold">${product.price}</p>
          <p className="text-sm">In stock: {product.stock}</p>
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              max={product.stock}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={addToCart}>Add to cart</Button>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Continue shopping
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
