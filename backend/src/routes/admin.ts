import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  requireRoles,
  type AuthedRequest,
} from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(authMiddleware);
adminRouter.use(requireRoles("SUPER_ADMIN"));

adminRouter.get("/vendors", async (_req, res) => {
  const vendors = await prisma.user.findMany({
    where: { role: "VENDOR" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      store: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ vendors });
});

const createVendorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

adminRouter.post("/vendors", async (req, res) => {
  const parsed = createVendorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const vendor = await prisma.user.create({
    data: { email, password: hash, name, role: "VENDOR" },
    select: { id: true, email: true, name: true, role: true },
  });
  res.status(201).json({ vendor });
});

const createStoreSchema = z.object({
  vendorId: z.string().uuid(),
  name: z.string().min(1),
});

adminRouter.post("/stores", async (req, res) => {
  const parsed = createStoreSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { vendorId, name } = parsed.data;
  const vendor = await prisma.user.findFirst({
    where: { id: vendorId, role: "VENDOR" },
  });
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  const existingStore = await prisma.store.findUnique({
    where: { vendorId },
  });
  if (existingStore) {
    res.status(409).json({ error: "This vendor already has a store" });
    return;
  }
  const slugBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  let slug = slugBase || "store";
  let n = 0;
  while (await prisma.store.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugBase}-${n}`;
  }
  const store = await prisma.store.create({
    data: { name, slug, vendorId },
    include: { vendor: { select: { email: true, name: true } } },
  });
  res.status(201).json({ store });
});

adminRouter.get("/stats", async (_req: AuthedRequest, res) => {
  const [vendorCount, customerCount, storeCount, productCount, orderCount] =
    await Promise.all([
      prisma.user.count({ where: { role: "VENDOR" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.store.count(),
      prisma.product.count(),
      prisma.order.count(),
    ]);
  res.json({
    stats: { vendorCount, customerCount, storeCount, productCount, orderCount },
  });
});
