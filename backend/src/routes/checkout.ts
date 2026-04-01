import { Router } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRoles,
  type AuthedRequest,
} from "../middleware/auth.js";

export const checkoutRouter = Router();

checkoutRouter.use(authMiddleware);
checkoutRouter.use(requireRoles("CUSTOMER"));

checkoutRouter.post("/", async (req: AuthedRequest, res) => {
  const userId = req.user!.sub;
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                store: {
                  include: { vendor: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) {
      res.status(400).json({ error: "Cart is empty" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      let total = new Decimal(0);
      const lineSnapshots: {
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: Decimal;
        storeId: string;
        storeName: string;
        vendorId: string;
        vendorName: string;
      }[] = [];

      for (const line of cart.items) {
        const p = await tx.product.findUnique({
          where: { id: line.product.id },
          include: {
            store: {
              include: { vendor: { select: { id: true, name: true } } },
            },
          },
        });
        if (!p || p.stock < line.quantity) {
          throw new Error(
            `Insufficient stock for "${line.product.name}" (requested ${line.quantity}, available ${p?.stock ?? 0})`
          );
        }
        const lineTotal = p.price.mul(line.quantity);
        total = total.add(lineTotal);
        lineSnapshots.push({
          productId: p.id,
          productName: p.name,
          quantity: line.quantity,
          unitPrice: p.price,
          storeId: p.store.id,
          storeName: p.store.name,
          vendorId: p.store.vendor.id,
          vendorName: p.store.vendor.name,
        });
      }

      const order = await tx.order.create({
        data: {
          userId,
          total,
          status: "COMPLETED",
          items: {
            create: lineSnapshots.map((l) => ({
              productId: l.productId,
              productName: l.productName,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              storeId: l.storeId,
              storeName: l.storeName,
              vendorId: l.vendorId,
              vendorName: l.vendorName,
            })),
          },
        },
        include: { items: true },
      });

      for (const line of cart.items) {
        await tx.product.update({
          where: { id: line.product.id },
          data: { stock: { decrement: line.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });

    res.status(201).json({
      order: {
        id: result.id,
        total: result.total.toString(),
        createdAt: result.createdAt,
        items: result.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice.toString(),
          storeName: i.storeName,
          vendorName: i.vendorName,
          message: `"${i.productName}" is sold by vendor "${i.vendorName}" (store: ${i.storeName}). Quantity: ${i.quantity}. Stock has been deducted from this seller's inventory.`,
        })),
      },
      summary:
        "Order placed. Each line shows which vendor sold the item; their product stock has been reduced.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    res.status(400).json({ error: msg });
  }
});
