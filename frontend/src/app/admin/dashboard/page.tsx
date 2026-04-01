"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type VendorRow = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  store: { id: string; name: string; slug: string } | null;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<{
    vendorCount: number;
    customerCount: number;
    storeCount: number;
    productCount: number;
    orderCount: number;
  } | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);

  const [vEmail, setVEmail] = useState("");
  const [vPassword, setVPassword] = useState("");
  const [vName, setVName] = useState("");

  const [storeVendorId, setStoreVendorId] = useState("");
  const [storeName, setStoreName] = useState("");

  function load() {
    const token = getToken();
    if (!token) return;
    api<{ stats: typeof stats }>("/api/admin/stats", { token })
      .then((d) => setStats(d.stats))
      .catch(() => setStats(null));
    api<{ vendors: VendorRow[] }>("/api/admin/vendors", { token })
      .then((d) => setVendors(d.vendors))
      .catch(() => setVendors([]));
  }

  useEffect(() => {
    const u = getUser();
    const t = getToken();
    if (!u || u.role !== "SUPER_ADMIN" || !t) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
    load();
  }, [router]);

  async function createVendor(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    try {
      await api("/api/admin/vendors", {
        method: "POST",
        token,
        body: JSON.stringify({ email: vEmail, password: vPassword, name: vName }),
      });
      toast.success("Vendor created");
      setVEmail("");
      setVPassword("");
      setVName("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function createStore(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    try {
      await api("/api/admin/stores", {
        method: "POST",
        token,
        body: JSON.stringify({ vendorId: storeVendorId, name: storeName }),
      });
      toast.success("Store created and linked to vendor");
      setStoreName("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  if (!ready) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Create vendor accounts, then assign each vendor a store. Vendors manage products.
        </p>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["Vendors", stats.vendorCount],
              ["Customers", stats.customerCount],
              ["Stores", stats.storeCount],
              ["Products", stats.productCount],
              ["Orders", stats.orderCount],
            ] as const
          ).map(([label, n]) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{n}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add vendor</CardTitle>
            <CardDescription>Creates login for a seller (vendor role).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createVendor} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="ve">Email</Label>
                <Input
                  id="ve"
                  type="email"
                  required
                  value={vEmail}
                  onChange={(e) => setVEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vp">Password</Label>
                <Input
                  id="vp"
                  type="password"
                  required
                  minLength={6}
                  value={vPassword}
                  onChange={(e) => setVPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vn">Display name</Label>
                <Input
                  id="vn"
                  required
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                />
              </div>
              <Button type="submit">Create vendor</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign store to vendor</CardTitle>
            <CardDescription>One store per vendor. Pick a vendor without a store yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createStore} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="vid">Vendor</Label>
                <select
                  id="vid"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-2 focus-visible:outline-none"
                  required
                  value={storeVendorId}
                  onChange={(e) => setStoreVendorId(e.target.value)}
                >
                  <option value="">Select vendor</option>
                  {vendors
                    .filter((v) => !v.store)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sn">Store name</Label>
                <Input
                  id="sn"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. Tech Corner"
                />
              </div>
              <Button type="submit">Create store</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
          <CardDescription>Stores appear next to each vendor when assigned.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Store</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.email}</TableCell>
                  <TableCell>
                    {v.store ? (
                      <span>
                        {v.store.name}{" "}
                        <span className="text-muted-foreground">({v.store.slug})</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No store yet</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
