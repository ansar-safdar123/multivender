import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRoles,
  type AuthedRequest,
} from "../middleware/auth.js";
import { paramId } from "../utils/params.js";

export const cartRouter = Router();

cartRouter.use(authMiddleware);
cartRouter.use(requireRoles("CUSTOMER"));

async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              store: {
                select: {
                  id: true,
                  name: true,
                  vendor: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                store: {
                  select: {
                    id: true,
                    name: true,
                    vendor: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }
  return cart;
}

cartRouter.get("/", async (req: AuthedRequest, res) => {
  const cart = await getOrCreateCart(req.user!.sub);
  const items = cart.items.map((i) => ({
    id: i.id,
    quantity: i.quantity,
    product: {
      id: i.product.id,
      name: i.product.name,
      price: i.product.price.toString(),
      imageUrl: i.product.imageUrl,
      stock: i.product.stock,
      storeName: i.product.store.name,
      vendorName: i.product.store.vendor.name,
    },
  }));
  const subtotal = cart.items.reduce(
    (sum, i) => sum + Number(i.product.price) * i.quantity,
    0
  );
  res.json({ items, subtotal: subtotal.toFixed(2) });
});

const addSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(99),
});

cartRouter.post("/items", async (req: AuthedRequest, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { productId, quantity } = parsed.data;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.stock < quantity) {
    res.status(400).json({ error: "Product unavailable or insufficient stock" });
    return;
  }
  const cart = await getOrCreateCart(req.user!.sub);
  const existing = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: { cartId: cart.id, productId },
    },
  });
  const newQty = (existing?.quantity ?? 0) + quantity;
  if (newQty > product.stock) {
    res.status(400).json({ error: "Not enough stock" });
    return;
  }
  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
    });
  }
  res.status(201).json({ ok: true });
});

const patchSchema = z.object({
  quantity: z.coerce.number().int().min(1),
});

cartRouter.patch("/items/:itemId", async (req: AuthedRequest, res) => {
  const itemId = paramId(req.params.itemId);
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const cart = await getOrCreateCart(req.user!.sub);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    include: { product: true },
  });
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (parsed.data.quantity > item.product.stock) {
    res.status(400).json({ error: "Not enough stock" });
    return;
  }
  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: parsed.data.quantity },
  });
  res.json({ ok: true });
});

cartRouter.delete("/items/:itemId", async (req: AuthedRequest, res) => {
  const itemId = paramId(req.params.itemId);
  const cart = await getOrCreateCart(req.user!.sub);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await prisma.cartItem.delete({ where: { id: item.id } });
  res.status(204).send();
});
