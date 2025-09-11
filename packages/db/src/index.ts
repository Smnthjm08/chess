import "dotenv/config";
import { PrismaClient } from "../generated/prisma";

// use `prisma` in your application to read and write data in your DB
export const prisma = new PrismaClient();

// export * from "../generated/prisma";
