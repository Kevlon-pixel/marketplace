import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { getOrThrowEnv } from "../src/utils/getOrThrowEnv";

const connectionString = getOrThrowEnv("DATABASE_URL");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;
