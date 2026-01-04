import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as ws from "ws";

// Enable WebSocket for Neon serverless (required for Node.js environments)
neonConfig.webSocketConstructor = ws.WebSocket;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Create a connection pool with Neon serverless driver
  // This is optimized for serverless environments like Vercel
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Create Prisma adapter using Neon with connection pool configuration
  // PrismaNeon manages the pool internally
  const adapter = new PrismaNeon({
    connectionString,
    max: 10, // Maximum connections in the pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 10000, // Timeout for new connections
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache the client in development to prevent creating new connections on hot reload
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
