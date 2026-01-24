// Script to update existing trainers to show on website
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Update all COACH staff members to have showOnWebsite = true
  const result = await prisma.staff.updateMany({
    where: {
      role: "COACH",
      showOnWebsite: false,
    },
    data: {
      showOnWebsite: true,
    },
  });

  console.log(`Updated ${result.count} trainers to show on website`);

  // List all trainers
  const trainers = await prisma.staff.findMany({
    where: { role: "COACH" },
    select: {
      id: true,
      name: true,
      showOnWebsite: true,
      specialty: true,
    },
  });

  console.log("\nAll trainers:");
  trainers.forEach((t) => {
    console.log(`  - ${t.name}: showOnWebsite=${t.showOnWebsite}, specialty=${t.specialty || "not set"}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
