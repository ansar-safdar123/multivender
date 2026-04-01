"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Line = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: string;
    storeName: string;
    vendorName: string;
  };
};

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<Line[]>([]);
  const [subtotal, setSubtotal] = useState("0");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  function load() {
    const token = getToken();
    const user = getUser();
    if (!token || !user || user.role !== "CUSTOMER") {
      router.replace("/login");
      return;
    }
    api<{ items: Line[]; subtotal: string }>("/api/cart", { token })
      .then((d) => {
        setItems(d.items);
        setSubtotal(d.subtotal);
      })
      .catch(() => {
        setItems([]);
        setSubtotal("0");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [router]);

  async function updateQty(itemId: string, quantity: number) {
    const token = getToken();
    if (!token) return;
    try {
      await api(`/api/cart/items/${itemId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ quantity }),
      });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(itemId: string) {
    const token = getToken();
    if (!token) return;
    try {
      await api(`/api/cart/items/${itemId}`, { method: "DELETE", token });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function checkout() {
    const token = getToken();
    if (!token) return;
    setCheckingOut(true);
    try {
      const res = await api<{
        order: {
          id: string;
          total: string;
          items: { message: string }[];
        };
        summary: string;
      }>("/api/checkout", { method: "POST", token });
      sessionStorage.setItem(
        "mv_last_order",
        JSON.stringify({
          orderId: res.order.id,
          total: res.order.total,
          items: res.order.items,
          summary: res.summary,
        })
      );
      toast.success("Order placed");
      router.push("/checkout/success");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cart</h1>
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground">
              Your cart is empty. <Link href="/">Browse products</Link>
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Store / seller</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="text-right">Line</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((line) => {
                    const lineTotal =
                      (Number(line.product.price) * line.quantity).toFixed(2);
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">{line.product.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {line.product.storeName}
                          <br />
                          <span className="text-xs">by {line.product.vendorName}</span>
                        </TableCell>
                        <TableCell>
                          <Input
                            key={`${line.id}-${line.quantity}`}
                            type="number"
                            min={1}
                            className="w-20"
                            defaultValue={line.quantity}
                            onBlur={(e) =>
                              updateQty(line.id, Math.max(1, Number(e.target.value) || 1))
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">${lineTotal}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => remove(line.id)}>
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                <p className="text-lg font-semibold">Subtotal: ${subtotal}</p>
                <Button size="lg" onClick={checkout} disabled={checkingOut}>
                  {checkingOut ? "Processing…" : "Checkout"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
