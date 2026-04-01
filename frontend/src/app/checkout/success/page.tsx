"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

type Stored = {
  orderId: string;
  total: string;
  items: { message: string }[];
  summary: string;
};

export default function CheckoutSuccessPage() {
  const [data, setData] = useState<Stored | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("mv_last_order");
    if (raw) {
      try {
        setData(JSON.parse(raw) as Stored);
      } catch {
        setData(null);
      }
    }
  }, []);

  if (!data) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>No order data</CardTitle>
          <CardDescription>Complete a checkout from your cart first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className={cn(buttonVariants())}>
            Back to shop
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Thank you</CardTitle>
          <CardDescription>
            Order <span className="font-mono text-foreground">{data.orderId}</span> — total{" "}
            <strong>${data.total}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">{data.summary}</p>
          <Separator />
          <ul className="space-y-3">
            {data.items.map((item, i) => (
              <li
                key={i}
                className="bg-muted/50 rounded-lg border p-3 text-sm leading-relaxed"
              >
                {item.message}
              </li>
            ))}
          </ul>
          <Link href="/" className={cn(buttonVariants(), "mt-4 inline-flex")}>
            Continue shopping
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
