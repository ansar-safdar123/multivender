import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@demo.local";
  const vendorEmail = "vendor@demo.local";
  const customerEmail = "customer@demo.local";
  const password = await bcrypt.hash("demo1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password,
      name: "Super Admin",
      role: "SUPER_ADMIN",
    },
  });

  const vendor = await prisma.user.upsert({
    where: { email: vendorEmail },
    update: {},
    create: {
      email: vendorEmail,
      password,
      name: "Demo Vendor",
      role: "VENDOR",
    },
  });

  await prisma.user.upsert({
    where: { email: customerEmail },
    update: {},
    create: {
      email: customerEmail,
      password,
      name: "Demo Customer",
      role: "CUSTOMER",
    },
  });

  await prisma.store.upsert({
    where: { vendorId: vendor.id },
    update: {},
    create: {
      name: "Demo Electronics",
      slug: "demo-electronics",
      vendorId: vendor.id,
    },
  });

  const store = await prisma.store.findUniqueOrThrow({
    where: { vendorId: vendor.id },
  });

  const count = await prisma.product.count({ where: { storeId: store.id } });
  if (count === 0) {
    await prisma.product.createMany({
      data: [
        {
          storeId: store.id,
          name: "Wireless Mouse",
          description: "Ergonomic wireless mouse",
          price: 24.99,
          stock: 50,
        },
        {
          storeId: store.id,
          name: "USB-C Hub",
          description: "7-in-1 hub",
          price: 45.0,
          stock: 30,
        },
      ],
    });
  }

  console.log("Seed OK");
  console.log("  Super admin:", adminEmail, "/ demo1234");
  console.log("  Vendor:", vendorEmail, "/ demo1234");
  console.log("  Customer:", customerEmail, "/ demo1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
