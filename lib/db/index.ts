import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as ws from "ws";

// Enable WebSocket for Neon serverless (required for Node.js environments)
// Use the WebSocket class directly to avoid bufferUtil issues
neonConfig.webSocketConstructor = ws.WebSocket;
// Disable pooling in development to avoid connection issues during HMR
neonConfig.poolQueryViaFetch = process.env.NODE_ENV === "production";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Database selection logic (no separate staging environment):
  // - Local development (NODE_ENV=development, not on Vercel): DEV_DATABASE_URL || DATABASE_URL
  // - Everything on Vercel — production AND preview: DATABASE_URL
  //   NOTE: there is no staging DB, so Vercel Preview deployments use the PRODUCTION
  //   database. Disable Preview deployments in Vercel if that is a concern.
  const isLocalDev = process.env.NODE_ENV === "development" && !process.env.VERCEL_ENV;

  const connectionString = isLocalDev
    ? process.env.DEV_DATABASE_URL || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      `Database URL not configured for ${isLocalDev ? "local" : "production"} environment. ` +
      `Set ${isLocalDev ? "DEV_DATABASE_URL (or DATABASE_URL)" : "DATABASE_URL"}.`
    );
  }

  // Check if using local PostgreSQL (doesn't support Neon WebSocket adapter)
  const isLocalDatabase = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  if (isLocalDatabase) {
    // Use standard Prisma client for local PostgreSQL
    return new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }

  // Use Neon adapter for cloud databases (optimized for serverless)
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
