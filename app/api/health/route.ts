import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Health check endpoint for monitoring services.
 *
 * Used by:
 * - Uptime monitoring (UptimeRobot, Checkly, etc.)
 * - Load balancers
 * - Deployment verification
 *
 * Returns:
 * - 200 OK: System is healthy
 * - 503 Service Unavailable: System is unhealthy (database down, etc.)
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: 'connected',
          latency: `${dbLatency}ms`,
        },
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: 'disconnected',
          error: errorMessage,
        },
      },
    }, { status: 503 });
  }
}
