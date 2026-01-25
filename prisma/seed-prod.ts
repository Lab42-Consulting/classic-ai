import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Production seed only uses the main DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL not configured");
}

console.log(`🔗 Using PRODUCTION database`);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

async function main() {
  console.log("🌱 Starting production seed...\n");

  // Create Gym with Pro tier
  const gymSubscribedAt = new Date();
  const gymSubscribedUntil = new Date();
  gymSubscribedUntil.setFullYear(gymSubscribedUntil.getFullYear() + 1); // 1 year subscription

  const gym = await prisma.gym.upsert({
    where: { id: "gym-classic-001" },
    update: {
      logo: "/logo/classic-logo-color.webp",
      aiMonthlyBudget: 50,
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      subscribedAt: gymSubscribedAt,
      subscribedUntil: gymSubscribedUntil,
      address: "Bulevar oslobođenja 83, Novi Sad 21000",
      phone: "060 0136913",
      openingHours: "Ponedeljak - Petak: 07:00–23:00\nSubota: 08:00–22:00\nNedelja: 09:00–21:00",
    },
    create: {
      id: "gym-classic-001",
      name: "Classic Gym Bulevar",
      logo: "/logo/classic-logo-color.webp",
      aiMonthlyBudget: 50,
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      subscribedAt: gymSubscribedAt,
      subscribedUntil: gymSubscribedUntil,
      address: "Bulevar oslobođenja 83, Novi Sad 21000",
      phone: "060 0136913",
      openingHours: "Ponedeljak - Petak: 07:00–23:00\nSubota: 08:00–22:00\nNedelja: 09:00–21:00",
      settings: {
        primaryMetric: "calories",
        branding: {
          accentColor: "#dc2626",
        },
      },
    },
  });
  console.log(`✅ Gym created: ${gym.name} (${gym.subscriptionTier} tier, ${gym.subscriptionStatus})`);

  // Create Owner: STRUJA (primary owner with cross-gym access)
  const strujaPin = await hashPin("1234");
  const struja = await prisma.staff.upsert({
    where: {
      staffId_gymId: { staffId: "STRUJA", gymId: gym.id }
    },
    update: {},
    create: {
      staffId: "STRUJA",
      pin: strujaPin,
      name: "Struja Owner",
      role: "owner",
      gymId: gym.id,
    },
  });
  console.log(`✅ Owner created: ${struja.staffId} (PIN: 1234)`);

  // Create Admin: KOLEKTIV (gym-specific admin)
  const kolektivPin = await hashPin("1234");
  const kolektiv = await prisma.staff.upsert({
    where: {
      staffId_gymId: { staffId: "KOLEKTIV", gymId: gym.id }
    },
    update: {},
    create: {
      staffId: "KOLEKTIV",
      pin: kolektivPin,
      name: "Kolektiv Admin",
      role: "admin",
      gymId: gym.id,
    },
  });
  console.log(`✅ Admin created: ${kolektiv.staffId} (PIN: 1234)`);

  // Print summary
  console.log("\n\n✨ Production seed completed!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PRODUCTION DATA SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n  🏋️ GYM:");
  console.log(`  │ Name: ${gym.name}`);
  console.log(`  │ Tier: ${gym.subscriptionTier}`);
  console.log(`  │ Address: ${gym.address}`);
  console.log("");
  console.log("  🔐 STAFF LOGIN (/staff-login):");
  console.log("  ┌─────────────┬────────┬──────────────────┐");
  console.log("  │ Staff ID    │ PIN    │ Role             │");
  console.log("  ├─────────────┼────────┼──────────────────┤");
  console.log("  │ STRUJA      │ 1234   │ Owner            │");
  console.log("  │ KOLEKTIV    │ 1234   │ Admin            │");
  console.log("  └─────────────┴────────┴──────────────────┘");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Production seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
