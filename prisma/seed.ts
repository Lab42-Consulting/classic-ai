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
    const randomVariation = (Math.random() - 0.5) * 0.6;

    if (goal === "fat_loss") {
      currentWeight -= 0.3 + Math.random() * 0.3 + randomVariation;
    } else if (goal === "muscle_gain") {
      currentWeight += 0.1 + Math.random() * 0.2 + randomVariation;
    } else {
      currentWeight += randomVariation;
    }

    weights.push(Math.round(currentWeight * 10) / 10);
  }

  return weights;
}

function generateFeeling(): number {
  const rand = Math.random();
  if (rand < 0.1) return 1;
  if (rand < 0.3) return 2;
  if (rand < 0.6) return 3;
  return 4;
}

// Activity level determines how consistently a member logs
type ActivityLevel = "high" | "medium" | "low" | "inactive";

interface MemberConfig {
  memberId: string;
  pin: string;
  name: string;
  height: number;
  startWeight: number;
  gender: string;
  goal: "fat_loss" | "muscle_gain" | "recomposition";
  coachIndex: number | null; // null = no coach, 0-2 = coach index
  activityLevel: ActivityLevel;
  freshStart: boolean; // true = no history at all
  subscriptionStatus: "active" | "trial" | "expired";
}

async function main() {
  console.log("🌱 Starting comprehensive seed...\n");

  // Create Gym
  const gym = await prisma.gym.upsert({
    where: { id: "gym-classic-001" },
    update: {
      logo: "/logo/classic-logo-color.webp",
      aiMonthlyBudget: 50,
    },
    create: {
      id: "gym-classic-001",
      name: "Classic Gym Bulevar",
      logo: "/logo/classic-logo-color.webp",
      aiMonthlyBudget: 50,
      settings: {
        primaryMetric: "calories",
        branding: {
          accentColor: "#dc2626",
        },
      },
    },
  });
  console.log(`✅ Gym created: ${gym.name}`);

  // Create Admin
  const adminPin = await hashPin("1234");
  const admin = await prisma.staff.upsert({
    where: {
      staffId_gymId: { staffId: "S-ADMIN", gymId: gym.id }
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

  // Create 3 Coaches
  const coachConfigs = [
    { staffId: "MANJA", pin: "5678", name: "Coach Manja" },
    { staffId: "GATI", pin: "1357", name: "Branko Gatarić" },
    { staffId: "NINA", pin: "2468", name: "Nina Petrović" },
  ];

  const coaches = [];
  for (const config of coachConfigs) {
    const hashedPin = await hashPin(config.pin);
    const coach = await prisma.staff.upsert({
      where: {
        staffId_gymId: { staffId: config.staffId, gymId: gym.id }
      },
      update: {},
      create: {
        staffId: config.staffId,
        pin: hashedPin,
        name: config.name,
        role: "coach",
        gymId: gym.id,
      },
    });
    coaches.push(coach);
    console.log(`✅ Coach created: ${config.staffId} (PIN: ${config.pin})`);
  }

  // Define 20 members with various configurations
  // Note: Member IDs must be at least 4 characters
  const members: MemberConfig[] = [
    // ========== Coach 0 (MANJA) - 5 members ==========
    { memberId: "MJ01", pin: "1001", name: "Marko Jovanović", height: 182, startWeight: 92, gender: "male", goal: "fat_loss", coachIndex: 0, activityLevel: "high", freshStart: false, subscriptionStatus: "active" },
    { memberId: "AN02", pin: "1002", name: "Ana Nikolić", height: 168, startWeight: 72, gender: "female", goal: "fat_loss", coachIndex: 0, activityLevel: "high", freshStart: false, subscriptionStatus: "active" },
    { memberId: "SD03", pin: "1003", name: "Stefan Đorđević", height: 178, startWeight: 78, gender: "male", goal: "muscle_gain", coachIndex: 0, activityLevel: "medium", freshStart: false, subscriptionStatus: "active" },
    { memberId: "JM04", pin: "1004", name: "Jelena Marković", height: 165, startWeight: 68, gender: "female", goal: "recomposition", coachIndex: 0, activityLevel: "low", freshStart: false, subscriptionStatus: "active" },
    { memberId: "NS05", pin: "1005", name: "Nikola Stojanović", height: 185, startWeight: 95, gender: "male", goal: "fat_loss", coachIndex: 0, activityLevel: "inactive", freshStart: false, subscriptionStatus: "active" },

    // ========== Coach 1 (GATI) - 5 members ==========
    { memberId: "MP06", pin: "1006", name: "Milan Petrović", height: 180, startWeight: 88, gender: "male", goal: "muscle_gain", coachIndex: 1, activityLevel: "high", freshStart: false, subscriptionStatus: "active" },
    { memberId: "II07", pin: "1007", name: "Ivana Ilić", height: 170, startWeight: 65, gender: "female", goal: "recomposition", coachIndex: 1, activityLevel: "high", freshStart: false, subscriptionStatus: "active" },
    { memberId: "DK08", pin: "1008", name: "Dragan Kovačević", height: 175, startWeight: 105, gender: "male", goal: "fat_loss", coachIndex: 1, activityLevel: "medium", freshStart: false, subscriptionStatus: "active" },
    { memberId: "MP09", pin: "1009", name: "Milica Popović", height: 162, startWeight: 58, gender: "female", goal: "muscle_gain", coachIndex: 1, activityLevel: "medium", freshStart: false, subscriptionStatus: "trial" },
    { memberId: "LS10", pin: "1010", name: "Luka Stanković", height: 190, startWeight: 82, gender: "male", goal: "muscle_gain", coachIndex: 1, activityLevel: "low", freshStart: false, subscriptionStatus: "active" },

    // ========== Coach 2 (NINA) - 5 members ==========
    { memberId: "SM11", pin: "1011", name: "Sara Mihajlović", height: 167, startWeight: 70, gender: "female", goal: "fat_loss", coachIndex: 2, activityLevel: "high", freshStart: false, subscriptionStatus: "active" },
    { memberId: "PP12", pin: "1012", name: "Petar Pavlović", height: 183, startWeight: 85, gender: "male", goal: "recomposition", coachIndex: 2, activityLevel: "medium", freshStart: false, subscriptionStatus: "active" },
    { memberId: "TT13", pin: "1013", name: "Teodora Tomić", height: 172, startWeight: 63, gender: "female", goal: "muscle_gain", coachIndex: 2, activityLevel: "medium", freshStart: false, subscriptionStatus: "active" },
    { memberId: "AZ14", pin: "1014", name: "Aleksandar Živković", height: 176, startWeight: 98, gender: "male", goal: "fat_loss", coachIndex: 2, activityLevel: "inactive", freshStart: false, subscriptionStatus: "expired" },
    { memberId: "MO15", pin: "1015", name: "Maja Obradović", height: 160, startWeight: 55, gender: "female", goal: "recomposition", coachIndex: 2, activityLevel: "low", freshStart: false, subscriptionStatus: "active" },

    // ========== No Coach, With Activity - 2 members ==========
    { memberId: "STRUJA", pin: "1111", name: "Miloš Mladenović", height: 180, startWeight: 95, gender: "male", goal: "fat_loss", coachIndex: null, activityLevel: "medium", freshStart: false, subscriptionStatus: "active" },
    { memberId: "TEST", pin: "3333", name: "Marko Petrović", height: 175, startWeight: 78, gender: "male", goal: "recomposition", coachIndex: null, activityLevel: "low", freshStart: false, subscriptionStatus: "active" },

    // ========== Completely New Members (Fresh Start, No Coach) - 3 members ==========
    { memberId: "CEPA", pin: "2222", name: "Stefan Radonjić", height: 184, startWeight: 82, gender: "male", goal: "muscle_gain", coachIndex: null, activityLevel: "inactive", freshStart: true, subscriptionStatus: "active" },
    { memberId: "NEW1", pin: "4001", name: "Jovana Simić", height: 166, startWeight: 60, gender: "female", goal: "fat_loss", coachIndex: null, activityLevel: "inactive", freshStart: true, subscriptionStatus: "trial" },
    { memberId: "NEW2", pin: "4002", name: "Filip Arsenijević", height: 179, startWeight: 75, gender: "male", goal: "muscle_gain", coachIndex: null, activityLevel: "inactive", freshStart: true, subscriptionStatus: "trial" },
  ];

  const WEEKS_OF_HISTORY = 12;
  const today = new Date();
  const currentWeek = getWeekNumber(today);
  const createdMembers: { id: string; memberId: string; coachIndex: number | null; activityLevel: ActivityLevel }[] = [];

  console.log(`\n📊 Creating ${members.length} members...`);

  for (const memberData of members) {
    const hashedPin = await hashPin(memberData.pin);

    let currentWeight = memberData.startWeight;
    let memberSince = new Date(today);
    let weightProgression: number[] = [];

    if (!memberData.freshStart) {
      weightProgression = generateWeightProgression(
        memberData.startWeight,
        memberData.goal,
        WEEKS_OF_HISTORY
      );
      currentWeight = weightProgression[weightProgression.length - 1];
      memberSince.setDate(memberSince.getDate() - WEEKS_OF_HISTORY * 7);
    }

    // Calculate subscription dates
    const subscribedAt = new Date();
    const subscribedUntil = new Date();
    if (memberData.subscriptionStatus === "expired") {
      subscribedUntil.setDate(subscribedUntil.getDate() - 5); // Expired 5 days ago
    } else if (memberData.subscriptionStatus === "trial") {
      subscribedUntil.setDate(subscribedUntil.getDate() + 7); // Trial ends in 7 days
    } else {
      subscribedUntil.setDate(subscribedUntil.getDate() + 30); // 30 days from now
    }

    const member = await prisma.member.upsert({
      where: {
        memberId_gymId: { memberId: memberData.memberId, gymId: gym.id }
      },
      update: {
        weight: currentWeight,
        goal: memberData.goal,
        hasSeenOnboarding: !memberData.freshStart,
        subscriptionStatus: memberData.subscriptionStatus,
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
        hasSeenOnboarding: !memberData.freshStart,
        createdAt: memberSince,
        subscriptionStatus: memberData.subscriptionStatus,
        subscribedAt: subscribedAt,
        subscribedUntil: subscribedUntil,
      },
    });

    createdMembers.push({
      id: member.id,
      memberId: memberData.memberId,
      coachIndex: memberData.coachIndex,
      activityLevel: memberData.activityLevel,
    });

    // Add check-in history for non-fresh members
    if (!memberData.freshStart) {
      const skipLastWeek = memberData.activityLevel === "inactive";

      for (let weeksAgo = WEEKS_OF_HISTORY; weeksAgo >= 1; weeksAgo--) {
        // Skip some weeks based on activity level
        if (memberData.activityLevel === "low" && Math.random() < 0.3) continue;
        if (memberData.activityLevel === "inactive" && Math.random() < 0.6) continue;

        const checkinDate = new Date(today);
        checkinDate.setDate(checkinDate.getDate() - weeksAgo * 7);
        const weekInfo = getWeekNumber(checkinDate);

        if (weekInfo.week === currentWeek.week && weekInfo.year === currentWeek.year) continue;
        if (skipLastWeek && weeksAgo === 1) continue;

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

      // Add daily logs based on activity level
      await addDailyLogs(member.id, memberData.activityLevel, today);
    }

    const statusIcon = memberData.freshStart ? "🆕" :
      memberData.activityLevel === "high" ? "🟢" :
      memberData.activityLevel === "medium" ? "🟡" :
      memberData.activityLevel === "low" ? "🟠" : "🔴";

    const coachName = memberData.coachIndex !== null ? coachConfigs[memberData.coachIndex].staffId : "None";
    console.log(`  ${statusIcon} ${memberData.memberId.padEnd(8)} - ${memberData.name.padEnd(22)} | Coach: ${coachName.padEnd(6)} | ${memberData.goal.padEnd(13)} | ${memberData.subscriptionStatus}`);
  }

  // Create coach assignments
  console.log("\n👨‍🏫 Creating coach assignments...");
  for (const memberInfo of createdMembers) {
    if (memberInfo.coachIndex !== null) {
      await prisma.coachAssignment.upsert({
        where: { memberId: memberInfo.id },
        update: {},
        create: {
          staffId: coaches[memberInfo.coachIndex].id,
          memberId: memberInfo.id,
          customCalories: Math.floor(Math.random() * 500) + 1800,
          customProtein: Math.floor(Math.random() * 50) + 120,
        },
      });
    }
  }
  console.log(`✅ Assigned 15 members to 3 coaches (5 each)`);

  // Add coach nudges for some members
  console.log("\n💬 Adding coach nudges...");
  const nudgeTemplates = [
    "Odlično napreduješ! Nastavi tako! 💪",
    "Vidim da si propustio par treninga. Sve ok?",
    "Ne zaboravi da uneseš obroke danas!",
    "Sjajan rad ove nedelje! 🎉",
    "Fokusiraj se na unos proteina, malo ti fali.",
  ];

  let nudgeCount = 0;
  for (const memberInfo of createdMembers) {
    if (memberInfo.coachIndex !== null && memberInfo.activityLevel !== "inactive") {
      // Add 1-3 nudges per active coached member
      const nudgesToAdd = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < nudgesToAdd; i++) {
        const daysAgo = Math.floor(Math.random() * 14);
        const createdAt = new Date(today);
        createdAt.setDate(createdAt.getDate() - daysAgo);

        await prisma.coachNudge.create({
          data: {
            staffId: coaches[memberInfo.coachIndex].id,
            memberId: memberInfo.id,
            message: nudgeTemplates[Math.floor(Math.random() * nudgeTemplates.length)],
            createdAt,
            seenAt: Math.random() > 0.3 ? new Date(createdAt.getTime() + Math.random() * 86400000) : null,
          },
        });
        nudgeCount++;
      }
    }
  }
  console.log(`✅ Added ${nudgeCount} coach nudges`);

  // Add coach knowledge for some members
  console.log("\n📝 Adding coach knowledge entries...");
  const knowledgeEntries = [
    { agentType: "nutrition", content: "Preferira mediteransku ishranu. Izbegava mlečne proizvode (laktoza intolerancija)." },
    { agentType: "training", content: "Radi Upper/Lower split 4x nedeljno. Problem sa levim ramenom - izbegavati overhead press." },
    { agentType: "supplements", content: "Koristi kreatin 5g dnevno. Preporučen vitamin D u zimskim mesecima." },
  ];

  let knowledgeCount = 0;
  for (const memberInfo of createdMembers) {
    if (memberInfo.coachIndex !== null && Math.random() > 0.5) {
      const entry = knowledgeEntries[Math.floor(Math.random() * knowledgeEntries.length)];
      await prisma.coachKnowledge.upsert({
        where: {
          staffId_memberId_agentType: {
            staffId: coaches[memberInfo.coachIndex].id,
            memberId: memberInfo.id,
            agentType: entry.agentType,
          },
        },
        update: {},
        create: {
          staffId: coaches[memberInfo.coachIndex].id,
          memberId: memberInfo.id,
          agentType: entry.agentType,
          content: entry.content,
        },
      });
      knowledgeCount++;
    }
  }
  console.log(`✅ Added ${knowledgeCount} coach knowledge entries`);

  // Seed common ingredients
  console.log("\n🥗 Seeding common ingredients library...");
  const strujaId = createdMembers.find(m => m.memberId === "STRUJA")?.id;
  if (strujaId) {
    await seedIngredients(strujaId, gym.id);
    console.log(`✅ Seeded common ingredients`);
  }

  // Seed AI response cache
  console.log("\n🤖 Seeding AI response cache...");
  if (process.env.ANTHROPIC_API_KEY) {
    const seededCount = await seedCacheIfEmpty(generateGenericResponse);
    if (seededCount > 0) {
      console.log(`✅ Seeded ${seededCount} AI responses`);
    } else {
      console.log(`✅ AI cache already populated`);
    }
  } else {
    console.log(`⚠️  Skipped AI cache seeding (ANTHROPIC_API_KEY not set)`);
  }

  // Print summary
  printSummary(coachConfigs, members);
}

async function addDailyLogs(memberId: string, activityLevel: ActivityLevel, today: Date) {
  const daysToLog = activityLevel === "high" ? 7 :
    activityLevel === "medium" ? 4 :
    activityLevel === "low" ? 2 : 0;

  for (let daysAgo = 0; daysAgo < daysToLog; daysAgo++) {
    const logDate = new Date(today);
    logDate.setDate(logDate.getDate() - daysAgo);

    // Add 2-4 meals
    const mealCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < mealCount; i++) {
      await prisma.dailyLog.create({
        data: {
          memberId,
          type: "meal",
          mealSize: ["small", "medium", "large"][Math.floor(Math.random() * 3)],
          mealName: ["Doručak", "Ručak", "Večera", "Užina"][i] || "Obrok",
          estimatedCalories: Math.floor(Math.random() * 400) + 300,
          estimatedProtein: Math.floor(Math.random() * 30) + 20,
          estimatedCarbs: Math.floor(Math.random() * 50) + 30,
          estimatedFats: Math.floor(Math.random() * 20) + 10,
          date: logDate,
        },
      });
    }

    // Maybe add training (70% chance for high activity)
    if (activityLevel === "high" && Math.random() > 0.3) {
      await prisma.dailyLog.create({
        data: {
          memberId,
          type: "training",
          date: logDate,
        },
      });
    }

    // Add water logs (2-6)
    const waterCount = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < waterCount; i++) {
      await prisma.dailyLog.create({
        data: {
          memberId,
          type: "water",
          date: logDate,
        },
      });
    }
  }
}

async function seedIngredients(memberId: string, gymId: string) {
  const ingredients = [
    { name: "Pileća prsa", defaultPortion: "100g", calories: 165, protein: 31, carbs: 0, fats: 4 },
    { name: "Pirinač (kuvani)", defaultPortion: "100g", calories: 130, protein: 3, carbs: 28, fats: 0 },
    { name: "Jaje (celo)", defaultPortion: "1 kom", calories: 78, protein: 6, carbs: 1, fats: 5 },
    { name: "Grčki jogurt", defaultPortion: "100g", calories: 97, protein: 9, carbs: 3, fats: 5 },
    { name: "Banana", defaultPortion: "1 kom", calories: 105, protein: 1, carbs: 27, fats: 0 },
    { name: "Ovsene pahuljice", defaultPortion: "50g", calories: 190, protein: 7, carbs: 34, fats: 3 },
    { name: "Tuna (konzerva)", defaultPortion: "100g", calories: 116, protein: 26, carbs: 0, fats: 1 },
    { name: "Whey protein", defaultPortion: "30g", calories: 120, protein: 24, carbs: 3, fats: 1 },
    { name: "Brokoli", defaultPortion: "100g", calories: 34, protein: 3, carbs: 7, fats: 0 },
    { name: "Maslinovo ulje", defaultPortion: "1 kašika", calories: 119, protein: 0, carbs: 0, fats: 14 },
  ];

  for (const ing of ingredients) {
    await prisma.savedIngredient.upsert({
      where: {
        id: `common-${ing.name.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "")}`,
      },
      update: {},
      create: {
        id: `common-${ing.name.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "")}`,
        memberId,
        gymId,
        name: ing.name,
        defaultPortion: ing.defaultPortion,
        calories: ing.calories,
        protein: ing.protein,
        carbs: ing.carbs,
        fats: ing.fats,
        isShared: true,
      },
    });
  }
}

function printSummary(coachConfigs: { staffId: string; pin: string; name: string }[], members: MemberConfig[]) {
  console.log("\n\n✨ Seed completed!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  COMPREHENSIVE TEST DATA SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("\n  📊 MEMBER DISTRIBUTION:");
  console.log("  ┌──────────────────────────────────────────────────────────────────┐");
  console.log("  │ Total Members: 20                                                │");
  console.log("  │ ├─ Assigned to Coach MANJA: 5 (mixed activity levels)            │");
  console.log("  │ ├─ Assigned to Coach GATI:  5 (mixed activity levels)            │");
  console.log("  │ ├─ Assigned to Coach NINA:  5 (mixed activity levels)            │");
  console.log("  │ ├─ No Coach (with history): 2 (STRUJA, TEST)                     │");
  console.log("  │ └─ Completely New (fresh):  3 (CEPA, NEW1, NEW2)                 │");
  console.log("  └──────────────────────────────────────────────────────────────────┘");

  console.log("\n  🎯 ACTIVITY LEVELS:");
  console.log("  ┌──────────────────────────────────────────────────────────────────┐");
  console.log("  │ 🟢 High:     Logs daily, consistent check-ins                    │");
  console.log("  │ 🟡 Medium:   Logs 4-5 days/week, mostly consistent               │");
  console.log("  │ 🟠 Low:      Logs 2-3 days/week, some missed check-ins           │");
  console.log("  │ 🔴 Inactive: Rarely logs, many missed check-ins                  │");
  console.log("  │ 🆕 Fresh:    No history at all (new member)                      │");
  console.log("  └──────────────────────────────────────────────────────────────────┘");

  console.log("\n  🔐 STAFF LOGIN (/staff-login):");
  console.log("  ┌─────────────┬────────┬──────────────────┐");
  console.log("  │ Staff ID    │ PIN    │ Role             │");
  console.log("  ├─────────────┼────────┼──────────────────┤");
  console.log("  │ S-ADMIN     │ 1234   │ Admin            │");
  for (const coach of coachConfigs) {
    console.log(`  │ ${coach.staffId.padEnd(11)} │ ${coach.pin}   │ Coach            │`);
  }
  console.log("  └─────────────┴────────┴──────────────────┘");

  console.log("\n  👤 MEMBER LOGIN (/login):");
  console.log("  ┌──────────┬────────┬───────────────┬────────────┬──────────┬────────────┐");
  console.log("  │ ID       │ PIN    │ Goal          │ Coach      │ Activity │ Status     │");
  console.log("  ├──────────┼────────┼───────────────┼────────────┼──────────┼────────────┤");

  for (const m of members) {
    const coachName = m.coachIndex !== null ? coachConfigs[m.coachIndex].staffId : "None";
    const activityIcon = m.freshStart ? "🆕" :
      m.activityLevel === "high" ? "🟢" :
      m.activityLevel === "medium" ? "🟡" :
      m.activityLevel === "low" ? "🟠" : "🔴";
    console.log(`  │ ${m.memberId.padEnd(8)} │ ${m.pin}   │ ${m.goal.padEnd(13)} │ ${coachName.padEnd(10)} │ ${activityIcon.padEnd(8)} │ ${m.subscriptionStatus.padEnd(10)} │`);
  }
  console.log("  └──────────┴────────┴───────────────┴────────────┴──────────┴────────────┘");

  console.log("\n  📋 TEST SCENARIOS:");
  console.log("  • Admin coach performance: Login as S-ADMIN, check /api/admin/coach-performance");
  console.log("  • Coach dashboard: Login as any coach to see assigned member stats");
  console.log("  • New member onboarding: Login as CEPA, NEW01, or NEW02");
  console.log("  • Coach request flow: Login as STRUJA or TEST (no coach assigned)");
  console.log("  • Expired subscription: M14 has expired status");
  console.log("  • Trial members: M09, NEW01, NEW02 are on trial");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
