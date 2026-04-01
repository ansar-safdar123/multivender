import { Router } from "express";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRoles,
  type AuthedRequest,
} from "../middleware/auth.js";
import { paramId } from "../utils/params.js";

export const vendorRouter = Router();

vendorRouter.use(authMiddleware);
vendorRouter.use(requireRoles("VENDOR"));

vendorRouter.get("/me", async (req: AuthedRequest, res) => {
  const store = await prisma.store.findUnique({
    where: { vendorId: req.user!.sub },
    include: {
      products: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!store) {
    res.json({ store: null, message: "No store assigned yet. Contact admin." });
    return;
  }
  const products = store.products.map((p) => ({
    ...p,
    price: p.price.toString(),
  }));
  res.json({
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      products,
    },
  });
});

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

vendorRouter.post("/products", async (req: AuthedRequest, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const store = await prisma.store.findUnique({
    where: { vendorId: req.user!.sub },
  });
  if (!store) {
    res.status(403).json({ error: "No store assigned" });
    return;
  }
  const { name, description, price, stock, imageUrl } = parsed.data;
  const product = await prisma.product.create({
    data: {
      name,
      description: description || null,
      price: new Decimal(price),
      stock,
      imageUrl: imageUrl || null,
      storeId: store.id,
    },
  });
  res.status(201).json({ product: { ...product, price: product.price.toString() } });
});

vendorRouter.patch("/products/:id", async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id);
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const store = await prisma.store.findUnique({
    where: { vendorId: req.user!.sub },
  });
  if (!store) {
    res.status(403).json({ error: "No store assigned" });
    return;
  }
  const existing = await prisma.product.findFirst({
    where: { id, storeId: store.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const data: Record<string, unknown> = {};
  const b = parsed.data;
  if (b.name !== undefined) data.name = b.name;
  if (b.description !== undefined) data.description = b.description || null;
  if (b.price !== undefined) data.price = new Decimal(b.price);
  if (b.stock !== undefined) data.stock = b.stock;
  if (b.imageUrl !== undefined) data.imageUrl = b.imageUrl || null;
  const product = await prisma.product.update({
    where: { id },
    data,
  });
  res.json({ product: { ...product, price: product.price.toString() } });
});

vendorRouter.delete("/products/:id", async (req: AuthedRequest, res) => {
  const id = paramId(req.params.id);
  const store = await prisma.store.findUnique({
    where: { vendorId: req.user!.sub },
  });
  if (!store) {
    res.status(403).json({ error: "No store assigned" });
    return;
  }
  const existing = await prisma.product.findFirst({
    where: { id, storeId: store.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  await prisma.product.delete({ where: { id } });
  res.status(204).send();
});
