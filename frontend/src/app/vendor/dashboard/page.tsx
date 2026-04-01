"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  imageUrl: string | null;
};

export default function VendorDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [store, setStore] = useState<{
    id: string;
    name: string;
    slug: string;
    products: Product[];
  } | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "0",
    imageUrl: "",
  });

  function load() {
    const token = getToken();
    if (!token) return;
    api<{ store: typeof store; message?: string }>("/api/vendor/me", { token })
      .then((d) => {
        if (d.message && !d.store) {
          setMessage(d.message);
          setStore(null);
        } else {
          setMessage(null);
          setStore(d.store);
        }
      })
      .catch(() => {
        setMessage("Could not load store.");
        setStore(null);
      });
  }

  useEffect(() => {
    const u = getUser();
    const t = getToken();
    if (!u || u.role !== "VENDOR" || !t) {
      router.replace("/vendor/login");
      return;
    }
    setReady(true);
    load();
  }, [router]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", description: "", price: "", stock: "0", imageUrl: "" });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || "",
      price: p.price,
      stock: String(p.stock),
      imageUrl: p.imageUrl || "",
    });
    setOpen(true);
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const body = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      stock: Number(form.stock),
      imageUrl: form.imageUrl.trim() || "",
    };
    try {
      if (editing) {
        await api(`/api/vendor/products/${editing.id}`, {
          method: "PATCH",
          token,
          body: JSON.stringify(body),
        });
        toast.success("Product updated");
      } else {
        await api("/api/vendor/products", {
          method: "POST",
          token,
          body: JSON.stringify(body),
        });
        toast.success("Product created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove(id: string) {
    const token = getToken();
    if (!token) return;
    if (!confirm("Delete this product?")) return;
    try {
      await api(`/api/vendor/products/${id}`, { method: "DELETE", token });
      toast.success("Deleted");
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

  if (message && !store) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Vendor dashboard</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Ask the super admin to create a store and link it to your vendor account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vendor dashboard</h1>
          {store && (
            <p className="text-muted-foreground text-sm">
              Store: <strong>{store.name}</strong> ({store.slug})
            </p>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button
            onClick={() => {
              openNew();
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add product
          </Button>
          <DialogContent>
            <form onSubmit={saveProduct}>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                <div className="space-y-2">
                  <Label htmlFor="pname">Name</Label>
                  <Input
                    id="pname"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pdesc">Description</Label>
                  <Textarea
                    id="pdesc"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="pprice">Price</Label>
                    <Input
                      id="pprice"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pst">Stock</Label>
                    <Input
                      id="pst"
                      type="number"
                      min="0"
                      required
                      value={form.stock}
                      onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pimg">Image URL (optional)</Label>
                  <Input
                    id="pimg"
                    type="url"
                    placeholder="https://..."
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>Create, update, or delete items in your catalog.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(store?.products ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>${p.price}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {store && store.products.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">No products yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
