import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week: weekNumber, year: d.getUTCFullYear() };
}

// Generate realistic weight progression based on goal
function generateWeightProgression(
  startWeight: number,
  goal: string,
  weeks: number
): number[] {
  const weights: number[] = [];
  let currentWeight = startWeight;

  for (let i = 0; i < weeks; i++) {
    // Add some randomness to simulate real progress
    const randomVariation = (Math.random() - 0.5) * 0.6; // +/- 0.3 kg random

    if (goal === "fat_loss") {
      // Lose 0.3-0.6 kg per week on average
      currentWeight -= 0.3 + Math.random() * 0.3 + randomVariation;
    } else if (goal === "muscle_gain") {
      // Gain 0.1-0.3 kg per week on average
      currentWeight += 0.1 + Math.random() * 0.2 + randomVariation;
    } else {
      // Recomposition - stay relatively stable with slight fluctuations
      currentWeight += randomVariation;
    }

    // Round to 1 decimal
    weights.push(Math.round(currentWeight * 10) / 10);
  }

  return weights;
}

// Generate random feeling (1-4) with slight bias towards positive
function generateFeeling(): number {
  const rand = Math.random();
  if (rand < 0.1) return 1; // 10% feel bad
  if (rand < 0.3) return 2; // 20% feel okay
  if (rand < 0.6) return 3; // 30% feel good
  return 4; // 40% feel great
}

async function main() {
  console.log("🌱 Starting seed...\n");

  // Create Gym
  const gym = await prisma.gym.upsert({
    where: { id: "gym-classic-001" },
    update: {
      logo: "/logo/classic-logo-color.webp",
    },
    create: {
      id: "gym-classic-001",
      name: "Classic Gym Bulevar",
      logo: "/logo/classic-logo-color.webp",
      settings: {
        primaryMetric: "calories",
        branding: {
          accentColor: "#dc2626",
        },
      },
    },
  });
  console.log(`✅ Gym created: ${gym.name}`);

  // Create Admin Staff
  const adminPin = await hashPin("1234");
  const admin = await prisma.staff.upsert({
    where: {
      staffId_gymId: {
        staffId: "S-ADMIN",
        gymId: gym.id,
      }
    },
    update: {},
    create: {
      staffId: "S-ADMIN",
      pin: adminPin,
      name: "Admin",
      role: "admin",
      gymId: gym.id,
    },
  });
  console.log(`✅ Admin created: ${admin.staffId} (PIN: 1234)`);

  // Create Coach Staff
  const coachPin = await hashPin("5678");
  const coach = await prisma.staff.upsert({
    where: {
      staffId_gymId: {
        staffId: "S-COACH",
        gymId: gym.id,
      }
    },
    update: {},
    create: {
      staffId: "S-COACH",
      pin: coachPin,
      name: "Coach Mike",
      role: "coach",
      gymId: gym.id,
    },
  });
  console.log(`✅ Coach created: ${coach.staffId} (PIN: 5678)`);

  // Create Sample Members
  const members = [
    {
      memberId: "STRUJA",
      pin: "1111",
      name: "Miloš Mladenović",
      height: 180,
      startWeight: 95,
      gender: "male",
      goal: "fat_loss",
    },
    {
      memberId: "ĆEPA",
      pin: "2222",
      name: "Stefan Radonjić",
      height: 184,
      startWeight: 82,
      gender: "male",
      goal: "muscle_gain",
    },
  ];

  const WEEKS_OF_HISTORY = 12; // 3 months
  const today = new Date();
  const currentWeek = getWeekNumber(today);

  for (const memberData of members) {
    // Generate weight progression for 12 weeks
    const weightProgression = generateWeightProgression(
      memberData.startWeight,
      memberData.goal,
      WEEKS_OF_HISTORY
    );

    // Current weight is the last recorded weight
    const currentWeight = weightProgression[weightProgression.length - 1];

    const hashedPin = await hashPin(memberData.pin);

    // Set createdAt to 3 months ago
    const memberSince = new Date(today);
    memberSince.setDate(memberSince.getDate() - WEEKS_OF_HISTORY * 7);

    const member = await prisma.member.upsert({
      where: {
        memberId_gymId: {
          memberId: memberData.memberId,
          gymId: gym.id,
        }
      },
      update: {
        weight: currentWeight,
      },
      create: {
        memberId: memberData.memberId,
        pin: hashedPin,
        name: memberData.name,
        height: memberData.height,
        weight: currentWeight,
        gender: memberData.gender,
        goal: memberData.goal,
        gymId: gym.id,
        createdAt: memberSince,
      },
    });
    console.log(`✅ Member created: ${member.memberId} (PIN: ${memberData.pin})`);

    // Add 12 weeks of check-in history (but NOT the current week)
    // For STRUJA, also skip last week to test accountability feature
    const skipLastWeek = memberData.memberId === "STRUJA";
    console.log(`   ↳ Adding ${WEEKS_OF_HISTORY} weeks of check-in history...`);

    for (let weeksAgo = WEEKS_OF_HISTORY; weeksAgo >= 1; weeksAgo--) {
      const checkinDate = new Date(today);
      checkinDate.setDate(checkinDate.getDate() - weeksAgo * 7);

      const weekInfo = getWeekNumber(checkinDate);

      // Skip if this is the current week
      if (weekInfo.week === currentWeek.week && weekInfo.year === currentWeek.year) {
        continue;
      }

      // For STRUJA, also skip last week (weeksAgo === 1) to test missed week accountability
      if (skipLastWeek && weeksAgo === 1) {
        continue;
      }

      const weightIndex = WEEKS_OF_HISTORY - weeksAgo;
      const weight = weightProgression[weightIndex] || memberData.startWeight;

      await prisma.weeklyCheckin.upsert({
        where: {
          memberId_weekNumber_year: {
            memberId: member.id,
            weekNumber: weekInfo.week,
            year: weekInfo.year,
          },
        },
        update: {},
        create: {
          memberId: member.id,
          weight,
          feeling: generateFeeling(),
          weekNumber: weekInfo.week,
          year: weekInfo.year,
          createdAt: checkinDate,
        },
      });
    }
    console.log(`   ↳ Added check-in history (current week skipped${skipLastWeek ? ", last week also skipped for STRUJA" : ""})`);

    // Add some sample daily logs for today
    const logs = [
      {
        type: "meal",
        mealSize: "medium",
        mealName: "Doručak",
        calories: 500,
        protein: 35,
        carbs: 50,
        fats: 15,
      },
      {
        type: "meal",
        mealSize: "large",
        mealName: "Ručak",
        calories: 800,
        protein: 50,
        carbs: 80,
        fats: 25,
      },
      { type: "training", mealSize: null, mealName: null, calories: null, protein: null, carbs: null, fats: null },
      { type: "water", mealSize: null, mealName: null, calories: null, protein: null, carbs: null, fats: null },
      { type: "water", mealSize: null, mealName: null, calories: null, protein: null, carbs: null, fats: null },
      { type: "water", mealSize: null, mealName: null, calories: null, protein: null, carbs: null, fats: null },
    ];

    for (const log of logs) {
      await prisma.dailyLog.create({
        data: {
          memberId: member.id,
          type: log.type,
          mealSize: log.mealSize,
          mealName: log.mealName,
          estimatedCalories: log.calories,
          estimatedProtein: log.protein,
          estimatedCarbs: log.carbs,
          estimatedFats: log.fats,
          date: today,
        },
      });
    }
    console.log(`   ↳ Added ${logs.length} logs for today`);

    // Add sample AI summary
    await prisma.aISummary.create({
      data: {
        memberId: member.id,
        type: "daily",
        content:
          memberData.goal === "fat_loss"
            ? "Odlično napreduješ! Izgubio si skoro 5kg u poslednja 3 meseca. Nastavi sa doslednim treninzima i umerenim obrocima."
            : "Masa raste kako treba! Dodao si oko 2kg mišićne mase. Fokusiraj se na dovoljno proteina i odmor.",
        date: today,
      },
    });
    console.log(`   ↳ Added AI summary`);

    // Show weight progress summary
    const startW = memberData.startWeight;
    const endW = currentWeight;
    const diff = Math.round((endW - startW) * 10) / 10;
    console.log(
      `   ↳ Weight: ${startW}kg → ${endW}kg (${diff > 0 ? "+" : ""}${diff}kg)`
    );
  }

  console.log("\n✨ Seed completed!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  TEST CREDENTIALS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("  STAFF LOGIN (/staff-login):");
  console.log("  ┌─────────────┬────────┐");
  console.log("  │ Staff ID    │ PIN    │");
  console.log("  ├─────────────┼────────┤");
  console.log("  │ S-ADMIN     │ 1234   │");
  console.log("  │ S-COACH     │ 5678   │");
  console.log("  └─────────────┴────────┘");
  console.log("");
  console.log("  MEMBER LOGIN (/login):");
  console.log("  ┌─────────────┬────────┬────────────────┐");
  console.log("  │ Member ID   │ PIN    │ Goal           │");
  console.log("  ├─────────────┼────────┼────────────────┤");
  console.log("  │ STRUJA      │ 1111   │ Fat Loss       │");
  console.log("  │ ĆEPA        │ 2222   │ Muscle Gain    │");
  console.log("  └─────────────┴────────┴────────────────┘");
  console.log("");
  console.log("  📊 Each member has 12 weeks of check-in history");
  console.log("  ⏳ Current week check-in NOT done (for testing)");
  console.log("  ⚠️  STRUJA also missed LAST week (for accountability testing)");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
