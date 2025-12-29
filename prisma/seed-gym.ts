import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();

async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

function generateStaffId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "S-";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  GYM CREATION WIZARD");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Get gym name
  const gymName = await prompt("Enter gym name: ");
  if (!gymName) {
    console.error("❌ Gym name is required");
    process.exit(1);
  }

  // Get accent color
  console.log("\nDefault accent color is #ef4444 (red)");
  console.log("Popular options: #eab308 (yellow), #22c55e (green), #3b82f6 (blue), #8b5cf6 (purple)");
  let accentColor = await prompt("Enter accent color (hex, e.g. #eab308) or press Enter for default: ");

  if (!accentColor) {
    accentColor = "#ef4444";
    console.log("Using default: #ef4444");
  } else if (!isValidHexColor(accentColor)) {
    console.error("❌ Invalid hex color format. Use format: #RRGGBB");
    process.exit(1);
  }

  // Get logo path
  console.log("\nLogo should be placed in /public/logo/ directory");
  const logoPath = await prompt("Enter logo path (e.g. /logo/my-gym-logo.webp) or press Enter to skip: ");

  // Get AI budget
  const budgetInput = await prompt("\nEnter monthly AI budget in USD (default: 10): ");
  const aiBudget = budgetInput ? parseFloat(budgetInput) : 10;
  if (isNaN(aiBudget) || aiBudget < 0) {
    console.error("❌ Invalid budget amount");
    process.exit(1);
  }

  // Get admin name
  const adminName = await prompt("\nEnter admin name (default: Admin): ");
  const finalAdminName = adminName || "Admin";

  // Generate credentials
  const staffId = generateStaffId();
  const pin = generatePin();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  CREATING GYM & ADMIN...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Create gym
  const gym = await prisma.gym.create({
    data: {
      name: gymName,
      aiMonthlyBudget: aiBudget,
      logo: logoPath || null,
      settings: {
        accentColor: accentColor,
      },
    },
  });
  console.log(`✅ Gym created: ${gym.name} (ID: ${gym.id})`);
  console.log(`   ↳ Accent color: ${accentColor}`);
  console.log(`   ↳ AI budget: $${aiBudget}/month`);
  if (logoPath) {
    console.log(`   ↳ Logo: ${logoPath}`);
  }

  // Create admin
  const hashedPin = await hashPin(pin);
  const admin = await prisma.staff.create({
    data: {
      staffId: staffId,
      pin: hashedPin,
      name: finalAdminName,
      role: "admin",
      gymId: gym.id,
    },
  });
  console.log(`\n✅ Admin created: ${admin.name}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ADMIN CREDENTIALS (SAVE THESE!)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log(`  Gym:       ${gymName}`);
  console.log(`  Gym ID:    ${gym.id}`);
  if (logoPath) {
    console.log(`  Logo:      ${logoPath}`);
  }
  console.log("");
  console.log("  ┌─────────────────────────────────────┐");
  console.log(`  │ Staff ID:  ${staffId.padEnd(25)}│`);
  console.log(`  │ PIN:       ${pin.padEnd(25)}│`);
  console.log("  └─────────────────────────────────────┘");
  console.log("");
  console.log("  Login at: /staff-login");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
