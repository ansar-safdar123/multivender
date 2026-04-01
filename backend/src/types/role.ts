import type { User } from "@prisma/client";

/** Mirrors `User.role` / Prisma `Role` enum without importing a standalone enum type. */
export type Role = User["role"];
