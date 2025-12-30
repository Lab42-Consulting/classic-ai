import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedCacheIfEmpty } from "../lib/ai/cache";
import { generateGenericResponse } from "../lib/ai";

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
      aiMonthlyBudget: 10, // $10/month AI budget cap
    },
    create: {
      id: "gym-classic-001",
      name: "Classic Gym Bulevar",
      logo: "/logo/classic-logo-color.webp",
      aiMonthlyBudget: 10, // $10/month AI budget cap
      settings: {
        primaryMetric: "calories",
        branding: {
          accentColor: "#dc2626",
        },
      },
    },
  });
  console.log(`✅ Gym created: ${gym.name} (AI budget: $${gym.aiMonthlyBudget}/month)`);

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
        staffId: "MANJA",
        gymId: gym.id,
      }
    },
    update: {},
    create: {
      staffId: "MANJA",
      pin: coachPin,
      name: "Coach Manja",
      role: "coach",
      gymId: gym.id,
    },
  });
  console.log(`✅ Coach created: ${coach.staffId} (PIN: 5678)`);

  
  // Create Coach Staff
  const coachGatiPin = await hashPin("1357");
  const coachGati = await prisma.staff.upsert({
    where: {
      staffId_gymId: {
        staffId: "GATI",
        gymId: gym.id,
      }
    },
    update: {},
    create: {
      staffId: "GATI",
      pin: coachGatiPin,
      name: "Branko Gatarić",
      role: "coach",
      gymId: gym.id,
    },
  });
  console.log(`✅ Coach created: ${coachGati.staffId} (PIN: 1357)`);

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
      assignToCoach: false, // Not assigned - test coach request flow
      freshStart: false,
    },
    {
      memberId: "ĆEPA",
      pin: "2222",
      name: "Stefan Radonjić",
      height: 184,
      startWeight: 82,
      gender: "male",
      goal: "muscle_gain",
      assignToCoach: false, // Not assigned - test coach request flow
      freshStart: true, // Start from beginning - no logs, no history
    },
    {
      memberId: "TEST",
      pin: "3333",
      name: "Marko Petrović",
      height: 175,
      startWeight: 78,
      gender: "male",
      goal: "recomposition",
      assignToCoach: false, // Unassigned - for testing coach assignment flow
      freshStart: false,
    },
  ];

  const WEEKS_OF_HISTORY = 12; // 3 months
  const today = new Date();
  const currentWeek = getWeekNumber(today);

  for (const memberData of members) {
    const hashedPin = await hashPin(memberData.pin);

    // For fresh start members, use starting weight and current date
    // For others, generate weight progression
    let currentWeight = memberData.startWeight;
    let memberSince = new Date(today);
    let weightProgression: number[] = [];

    if (!memberData.freshStart) {
      // Generate weight progression for 12 weeks
      weightProgression = generateWeightProgression(
        memberData.startWeight,
        memberData.goal,
        WEEKS_OF_HISTORY
      );
      // Current weight is the last recorded weight
      currentWeight = weightProgression[weightProgression.length - 1];
      // Set createdAt to 3 months ago
      memberSince.setDate(memberSince.getDate() - WEEKS_OF_HISTORY * 7);
    }

    // Calculate subscription dates (all members get 30 days from now for testing)
    const subscribedAt = new Date();
    const subscribedUntil = new Date();
    subscribedUntil.setDate(subscribedUntil.getDate() + 30);

    const member = await prisma.member.upsert({
      where: {
        memberId_gymId: {
          memberId: memberData.memberId,
          gymId: gym.id,
        }
      },
      update: {
        weight: currentWeight,
        goal: memberData.goal,
        hasSeenOnboarding: !memberData.freshStart, // Show onboarding for fresh start members
        subscriptionStatus: "active",
        subscribedAt: subscribedAt,
        subscribedUntil: subscribedUntil,
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
        hasSeenOnboarding: !memberData.freshStart, // Show onboarding for fresh start members
        createdAt: memberSince,
        subscriptionStatus: "active",
        subscribedAt: subscribedAt,
        subscribedUntil: subscribedUntil,
      },
    });
    console.log(`✅ Member created: ${member.memberId} (PIN: ${memberData.pin})${memberData.freshStart ? " [FRESH START]" : ""}`);

    // Skip history for fresh start members
    if (memberData.freshStart) {
      console.log(`   ↳ Skipping history (fresh start member)`);
    } else {
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
    }

    // Skip daily logs and AI summary for fresh start members
    if (!memberData.freshStart) {
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
    }

    // Show weight progress summary
    if (!memberData.freshStart) {
      const startW = memberData.startWeight;
      const endW = currentWeight;
      const diff = Math.round((endW - startW) * 10) / 10;
      console.log(
        `   ↳ Weight: ${startW}kg → ${endW}kg (${diff > 0 ? "+" : ""}${diff}kg)`
      );
    } else {
      console.log(`   ↳ Starting weight: ${memberData.startWeight}kg`);
    }
  }

  // Create coach assignments - assign only some members to the coach
  console.log("\n👨‍🏫 Creating coach assignments...");
  const membersToAssign = members.filter(m => m.assignToCoach);
  const allMembers = await prisma.member.findMany({
    where: { gymId: gym.id },
    select: { id: true, name: true, memberId: true },
  });

  let assignedCount = 0;
  for (const memberData of membersToAssign) {
    const member = allMembers.find(m => m.memberId === memberData.memberId);
    if (member) {
      await prisma.coachAssignment.upsert({
        where: { memberId: member.id },
        update: {},
        create: {
          staffId: coach.id,
          memberId: member.id,
        },
      });
      assignedCount++;
    }
  }
  if (assignedCount > 0) {
    console.log(`✅ Assigned ${assignedCount} members to ${coach.name}`);
  }
  console.log(`ℹ️  ${allMembers.length} member(s) unassigned - test coach request flow`);

  // Seed common ingredients library
  console.log("\n🥗 Seeding common ingredients library...");
  const strujaId = allMembers.find(m => m.memberId === "STRUJA")?.id;

  if (strujaId) {
    const commonIngredients = [
      // Proteins
      { name: "Jaje (celo)", defaultPortion: "1 kom", calories: 78, protein: 6, carbs: 1, fats: 5 },
      { name: "Jaje (belance)", defaultPortion: "1 kom", calories: 17, protein: 4, carbs: 0, fats: 0 },
      { name: "Pileća prsa", defaultPortion: "100g", calories: 165, protein: 31, carbs: 0, fats: 4 },
      { name: "Pileći batak", defaultPortion: "100g", calories: 209, protein: 26, carbs: 0, fats: 11 },
      { name: "Ćuretina", defaultPortion: "100g", calories: 135, protein: 30, carbs: 0, fats: 1 },
      { name: "Juneće meso (mljeveno)", defaultPortion: "100g", calories: 250, protein: 26, carbs: 0, fats: 15 },
      { name: "Svinjetina", defaultPortion: "100g", calories: 242, protein: 27, carbs: 0, fats: 14 },
      { name: "Tuna (konzerva)", defaultPortion: "100g", calories: 116, protein: 26, carbs: 0, fats: 1 },
      { name: "Losos", defaultPortion: "100g", calories: 208, protein: 20, carbs: 0, fats: 13 },
      { name: "Skuša", defaultPortion: "100g", calories: 205, protein: 19, carbs: 0, fats: 14 },
      { name: "Škampi", defaultPortion: "100g", calories: 85, protein: 18, carbs: 1, fats: 1 },

      // Dairy
      { name: "Grčki jogurt", defaultPortion: "100g", calories: 97, protein: 9, carbs: 3, fats: 5 },
      { name: "Jogurt (obični)", defaultPortion: "100g", calories: 61, protein: 3, carbs: 5, fats: 3 },
      { name: "Mlijeko", defaultPortion: "200ml", calories: 84, protein: 6, carbs: 10, fats: 2 },
      { name: "Sir (gauda)", defaultPortion: "30g", calories: 108, protein: 8, carbs: 1, fats: 8 },
      { name: "Cottage cheese", defaultPortion: "100g", calories: 98, protein: 11, carbs: 3, fats: 4 },
      { name: "Whey protein", defaultPortion: "30g", calories: 120, protein: 24, carbs: 3, fats: 1 },

      // Carbs
      { name: "Pirinač (kuvani)", defaultPortion: "100g", calories: 130, protein: 3, carbs: 28, fats: 0 },
      { name: "Pirinač (sirovi)", defaultPortion: "100g", calories: 360, protein: 7, carbs: 80, fats: 1 },
      { name: "Ovsene pahuljice", defaultPortion: "50g", calories: 190, protein: 7, carbs: 34, fats: 3 },
      { name: "Krompir", defaultPortion: "100g", calories: 77, protein: 2, carbs: 17, fats: 0 },
      { name: "Slatki krompir", defaultPortion: "100g", calories: 86, protein: 2, carbs: 20, fats: 0 },
      { name: "Hleb (bijeli)", defaultPortion: "1 parče", calories: 79, protein: 3, carbs: 15, fats: 1 },
      { name: "Hleb (integralni)", defaultPortion: "1 parče", calories: 81, protein: 4, carbs: 14, fats: 1 },
      { name: "Tjestenina (kuvana)", defaultPortion: "100g", calories: 131, protein: 5, carbs: 25, fats: 1 },
      { name: "Tjestenina (sirova)", defaultPortion: "100g", calories: 371, protein: 13, carbs: 75, fats: 2 },

      // Fruits
      { name: "Banana", defaultPortion: "1 kom", calories: 105, protein: 1, carbs: 27, fats: 0 },
      { name: "Jabuka", defaultPortion: "1 kom", calories: 95, protein: 0, carbs: 25, fats: 0 },
      { name: "Narandža", defaultPortion: "1 kom", calories: 62, protein: 1, carbs: 15, fats: 0 },
      { name: "Jagode", defaultPortion: "100g", calories: 32, protein: 1, carbs: 8, fats: 0 },
      { name: "Borovnice", defaultPortion: "100g", calories: 57, protein: 1, carbs: 14, fats: 0 },
      { name: "Grožđe", defaultPortion: "100g", calories: 69, protein: 1, carbs: 18, fats: 0 },

      // Vegetables
      { name: "Brokoli", defaultPortion: "100g", calories: 34, protein: 3, carbs: 7, fats: 0 },
      { name: "Špinat", defaultPortion: "100g", calories: 23, protein: 3, carbs: 4, fats: 0 },
      { name: "Paradajz", defaultPortion: "100g", calories: 18, protein: 1, carbs: 4, fats: 0 },
      { name: "Krastavac", defaultPortion: "100g", calories: 16, protein: 1, carbs: 4, fats: 0 },
      { name: "Paprika", defaultPortion: "100g", calories: 31, protein: 1, carbs: 6, fats: 0 },
      { name: "Luk", defaultPortion: "100g", calories: 40, protein: 1, carbs: 9, fats: 0 },
      { name: "Šampinjoni", defaultPortion: "100g", calories: 22, protein: 3, carbs: 3, fats: 0 },

      // Fats & Nuts
      { name: "Maslinovo ulje", defaultPortion: "1 kašika", calories: 119, protein: 0, carbs: 0, fats: 14 },
      { name: "Maslac", defaultPortion: "10g", calories: 72, protein: 0, carbs: 0, fats: 8 },
      { name: "Kikiriki maslac", defaultPortion: "1 kašika", calories: 94, protein: 4, carbs: 3, fats: 8 },
      { name: "Bademi", defaultPortion: "30g", calories: 173, protein: 6, carbs: 6, fats: 15 },
      { name: "Orasi", defaultPortion: "30g", calories: 196, protein: 5, carbs: 4, fats: 20 },
      { name: "Avokado", defaultPortion: "100g", calories: 160, protein: 2, carbs: 9, fats: 15 },

      // Legumes
      { name: "Leblebije (kuvane)", defaultPortion: "100g", calories: 164, protein: 9, carbs: 27, fats: 3 },
      { name: "Crni pasulj (kuvani)", defaultPortion: "100g", calories: 132, protein: 9, carbs: 24, fats: 1 },
      { name: "Sočivo (kuvano)", defaultPortion: "100g", calories: 116, protein: 9, carbs: 20, fats: 0 },
    ];

    for (const ingredient of commonIngredients) {
      await prisma.savedIngredient.upsert({
        where: {
          id: `common-${ingredient.name.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "")}`,
        },
        update: {},
        create: {
          id: `common-${ingredient.name.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "")}`,
          memberId: strujaId,
          gymId: gym.id,
          name: ingredient.name,
          defaultPortion: ingredient.defaultPortion,
          calories: ingredient.calories,
          protein: ingredient.protein,
          carbs: ingredient.carbs,
          fats: ingredient.fats,
          isShared: true,
        },
      });
    }
    console.log(`✅ Seeded ${commonIngredients.length} common ingredients`);
  }

  // Seed AI response cache with suggested prompts
  console.log("\n🤖 Seeding AI response cache...");
  if (process.env.ANTHROPIC_API_KEY) {
    const seededCount = await seedCacheIfEmpty(generateGenericResponse);
    if (seededCount > 0) {
      console.log(`✅ Seeded ${seededCount} AI responses for suggested prompts`);
    } else {
      console.log(`✅ AI cache already populated (no new entries needed)`);
    }
  } else {
    console.log(`⚠️  Skipped AI cache seeding (ANTHROPIC_API_KEY not set)`);
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
  console.log("  │ MANJA       │ 5678   │");
  console.log("  │ GATI        │ 1357   │");
  console.log("  └─────────────┴────────┘");
  console.log("");
  console.log("  MEMBER LOGIN (/login):");
  console.log("  ┌─────────────┬────────┬────────────────┬────────────┬─────────────┐");
  console.log("  │ Member ID   │ PIN    │ Goal           │ Coach      │ Status      │");
  console.log("  ├─────────────┼────────┼────────────────┼────────────┼─────────────┤");
  console.log("  │ STRUJA      │ 1111   │ Fat Loss       │ ✗ None     │ 12wk hist   │");
  console.log("  │ ĆEPA        │ 2222   │ Muscle Gain    │ ✗ None     │ FRESH START │");
  console.log("  │ TEST        │ 3333   │ Recomposition  │ ✗ None     │ 12wk hist   │");
  console.log("  └─────────────┴────────┴────────────────┴────────────┴─────────────┘");
  console.log("");
  console.log("  📊 STRUJA & TEST have 12 weeks of check-in history");
  console.log("  🆕 ĆEPA starts FRESH (no logs, no history, shows onboarding)");
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
