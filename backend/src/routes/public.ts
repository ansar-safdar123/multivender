import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { paramId } from "../utils/params.js";

export const publicRouter = Router();

publicRouter.get("/products", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const products = await prisma.product.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          vendor: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  res.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price.toString(),
      stock: p.stock,
      imageUrl: p.imageUrl,
      store: {
        id: p.store.id,
        name: p.store.name,
        slug: p.store.slug,
        vendorName: p.store.vendor.name,
      },
    })),
  });
});

publicRouter.get("/products/:id", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: paramId(req.params.id) },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          vendor: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock,
      imageUrl: product.imageUrl,
      store: {
        id: product.store.id,
        name: product.store.name,
        vendorName: product.store.vendor.name,
      },
    },
  });
});
