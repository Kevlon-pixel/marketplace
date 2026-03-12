import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { getOrThrowEnv } from "../src/shared/utils/get-or-throw-env.js";
import isDev from "../src/shared/config/is-dev.js";

const connectionString = getOrThrowEnv("DATABASE_URL");

const globalForPrisma = globalThis as unknown as {
  prismaClient: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
  });
};

const prismaClient = globalForPrisma.prismaClient ?? createPrismaClient();

if (isDev) {
  globalForPrisma.prismaClient = prismaClient;
}

export default prismaClient;
