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

  // Create Gym with Pro tier (required for challenges, session scheduling, coach features)
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
      settings: {
        primaryMetric: "calories",
        branding: {
          accentColor: "#dc2626",
        },
      },
    },
  });
  console.log(`✅ Gym created: ${gym.name} (${gym.subscriptionTier} tier, ${gym.subscriptionStatus})`);

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

  // Seed challenges
  console.log("\n🏆 Seeding challenges...");

  // Challenge 1: Finished challenge (ended 1 week ago) with 3 winners
  const finishedChallengeStart = new Date(today);
  finishedChallengeStart.setDate(finishedChallengeStart.getDate() - 35); // Started 5 weeks ago
  const finishedChallengeEnd = new Date(today);
  finishedChallengeEnd.setDate(finishedChallengeEnd.getDate() - 7); // Ended 1 week ago

  const finishedChallenge = await prisma.challenge.upsert({
    where: { id: "challenge-finished-001" },
    update: {},
    create: {
      id: "challenge-finished-001",
      gymId: gym.id,
      name: "Novogodišnji Izazov",
      description: "Započni godinu zdravo! Prikupljaj bodove kroz pravilnu ishranu i trening.",
      rewardDescription: "Top 3: Mesečna članarina gratis + Classic majica",
      startDate: finishedChallengeStart,
      endDate: finishedChallengeEnd,
      joinDeadlineDays: 7,
      winnerCount: 3,
      status: "ended",
      pointsPerMeal: 5,
      pointsPerTraining: 15,
      pointsPerWater: 1,
      pointsPerCheckin: 25,
      streakBonus: 5,
    },
  });

  // Add 3 winners and some other participants to finished challenge
  const winnerMembers = createdMembers.filter(m =>
    ["MJ01", "AN02", "MP06"].includes(m.memberId)
  );
  const otherParticipants = createdMembers.filter(m =>
    ["SD03", "II07", "SM11", "PP12"].includes(m.memberId)
  );

  // Winner 1 - 1st place
  if (winnerMembers[0]) {
    await prisma.challengeParticipant.upsert({
      where: { challengeId_memberId: { challengeId: finishedChallenge.id, memberId: winnerMembers[0].id } },
      update: {},
      create: {
        challengeId: finishedChallenge.id,
        memberId: winnerMembers[0].id,
        totalPoints: 485,
        mealPoints: 180,
        trainingPoints: 165,
        waterPoints: 45,
        checkinPoints: 75,
        streakPoints: 20,
        currentStreak: 0,
        joinedAt: new Date(finishedChallengeStart.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Winner 2 - 2nd place
  if (winnerMembers[1]) {
    await prisma.challengeParticipant.upsert({
      where: { challengeId_memberId: { challengeId: finishedChallenge.id, memberId: winnerMembers[1].id } },
      update: {},
      create: {
        challengeId: finishedChallenge.id,
        memberId: winnerMembers[1].id,
        totalPoints: 412,
        mealPoints: 150,
        trainingPoints: 135,
        waterPoints: 52,
        checkinPoints: 50,
        streakPoints: 25,
        currentStreak: 0,
        joinedAt: new Date(finishedChallengeStart.getTime() + 1 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Winner 3 - 3rd place
  if (winnerMembers[2]) {
    await prisma.challengeParticipant.upsert({
      where: { challengeId_memberId: { challengeId: finishedChallenge.id, memberId: winnerMembers[2].id } },
      update: {},
      create: {
        challengeId: finishedChallenge.id,
        memberId: winnerMembers[2].id,
        totalPoints: 378,
        mealPoints: 140,
        trainingPoints: 120,
        waterPoints: 38,
        checkinPoints: 50,
        streakPoints: 30,
        currentStreak: 0,
        joinedAt: new Date(finishedChallengeStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Other participants (4th-7th place)
  const otherScores = [
    { totalPoints: 295, mealPoints: 100, trainingPoints: 105, waterPoints: 30, checkinPoints: 50, streakPoints: 10 },
    { totalPoints: 248, mealPoints: 85, trainingPoints: 90, waterPoints: 28, checkinPoints: 25, streakPoints: 20 },
    { totalPoints: 186, mealPoints: 70, trainingPoints: 60, waterPoints: 21, checkinPoints: 25, streakPoints: 10 },
    { totalPoints: 124, mealPoints: 45, trainingPoints: 45, waterPoints: 14, checkinPoints: 25, streakPoints: -5 },
  ];

  for (let i = 0; i < otherParticipants.length; i++) {
    const member = otherParticipants[i];
    const scores = otherScores[i] || otherScores[0];
    await prisma.challengeParticipant.upsert({
      where: { challengeId_memberId: { challengeId: finishedChallenge.id, memberId: member.id } },
      update: {},
      create: {
        challengeId: finishedChallenge.id,
        memberId: member.id,
        ...scores,
        currentStreak: 0,
        joinedAt: new Date(finishedChallengeStart.getTime() + (i + 4) * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`  ✅ Created finished challenge "${finishedChallenge.name}" with 7 participants`);

  // Challenge 2: Ongoing challenge (until end of February)
  const ongoingChallengeStart = new Date(today);
  ongoingChallengeStart.setDate(ongoingChallengeStart.getDate() - 10); // Started 10 days ago
  const ongoingChallengeEnd = new Date(today.getFullYear(), 1, 28); // February 28th

  const ongoingChallenge = await prisma.challenge.upsert({
    where: { id: "challenge-ongoing-001" },
    update: {},
    create: {
      id: "challenge-ongoing-001",
      gymId: gym.id,
      name: "Zimski Fitnes Marathon",
      description: "Održi formu tokom zime! Boduj svaki obrok, trening i čašu vode.",
      rewardDescription: "Top 3: 3 meseca članarine + Protein paket",
      startDate: ongoingChallengeStart,
      endDate: ongoingChallengeEnd,
      joinDeadlineDays: 14,
      winnerCount: 3,
      status: "registration",
      pointsPerMeal: 5,
      pointsPerTraining: 15,
      pointsPerWater: 1,
      pointsPerCheckin: 25,
      streakBonus: 5,
    },
  });

  // Add some participants to ongoing challenge
  const ongoingParticipants = createdMembers.filter(m =>
    ["MJ01", "AN02", "SD03", "MP06", "II07"].includes(m.memberId)
  );

  const ongoingScores = [
    { totalPoints: 145, mealPoints: 60, trainingPoints: 45, waterPoints: 20, checkinPoints: 0, streakPoints: 20, currentStreak: 4 },
    { totalPoints: 128, mealPoints: 50, trainingPoints: 45, waterPoints: 18, checkinPoints: 0, streakPoints: 15, currentStreak: 3 },
    { totalPoints: 98, mealPoints: 40, trainingPoints: 30, waterPoints: 13, checkinPoints: 0, streakPoints: 15, currentStreak: 3 },
    { totalPoints: 76, mealPoints: 30, trainingPoints: 30, waterPoints: 11, checkinPoints: 0, streakPoints: 5, currentStreak: 1 },
    { totalPoints: 52, mealPoints: 25, trainingPoints: 15, waterPoints: 12, checkinPoints: 0, streakPoints: 0, currentStreak: 0 },
  ];

  for (let i = 0; i < ongoingParticipants.length; i++) {
    const member = ongoingParticipants[i];
    const scores = ongoingScores[i];
    await prisma.challengeParticipant.upsert({
      where: { challengeId_memberId: { challengeId: ongoingChallenge.id, memberId: member.id } },
      update: {},
      create: {
        challengeId: ongoingChallenge.id,
        memberId: member.id,
        ...scores,
        lastActiveDate: new Date(today.getTime() - i * 24 * 60 * 60 * 1000),
        joinedAt: new Date(ongoingChallengeStart.getTime() + i * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`  ✅ Created ongoing challenge "${ongoingChallenge.name}" with 5 participants`);

  // Challenge 3: Scheduled challenge (starts in March - will show as "upcoming")
  const scheduledChallengeStart = new Date(today.getFullYear(), 2, 1); // March 1st
  const scheduledChallengeEnd = new Date(today.getFullYear(), 2, 31); // March 31st

  const scheduledChallenge = await prisma.challenge.upsert({
    where: { id: "challenge-scheduled-001" },
    update: {},
    create: {
      id: "challenge-scheduled-001",
      gymId: gym.id,
      name: "Prolećni Restart",
      description: "Dočekaj proleće u top formi! Mesec dana intenzivnog praćenja napretka.",
      rewardDescription: "Top 5: Personalizovani plan ishrane + Suplementi",
      startDate: scheduledChallengeStart,
      endDate: scheduledChallengeEnd,
      joinDeadlineDays: 10,
      winnerCount: 5,
      status: "registration", // Will compute to "upcoming" since startDate is in future
      pointsPerMeal: 5,
      pointsPerTraining: 20, // Higher training points for this challenge
      pointsPerWater: 2,
      pointsPerCheckin: 30,
      streakBonus: 10,
    },
  });

  console.log(`  ✅ Created scheduled challenge "${scheduledChallenge.name}" (starts March 1st)`);

  // Seed custom metrics
  console.log("\n📊 Seeding custom metrics...");
  await seedMetrics(createdMembers, coaches, today);

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

async function seedMetrics(
  createdMembers: { id: string; memberId: string; coachIndex: number | null; activityLevel: ActivityLevel }[],
  coaches: { id: string }[],
  today: Date
) {
  // Define metric templates
  const metricTemplates = [
    { name: "Bench Press", unit: "kg", higherIsBetter: true, baseValue: 60, variance: 40 },
    { name: "Čučanj", unit: "kg", higherIsBetter: true, baseValue: 80, variance: 50 },
    { name: "Mrtvo dizanje", unit: "kg", higherIsBetter: true, baseValue: 100, variance: 60 },
    { name: "Procenat masti", unit: "%", higherIsBetter: false, baseValue: 20, variance: 10 },
    { name: "Vertikalni skok", unit: "cm", higherIsBetter: true, baseValue: 40, variance: 20 },
    { name: "Trčanje 5K", unit: "min", higherIsBetter: false, baseValue: 28, variance: 10 },
    { name: "Pokretljivost kukova", unit: "cm", higherIsBetter: true, baseValue: 30, variance: 15 },
    { name: "Plank izdržaj", unit: "sek", higherIsBetter: true, baseValue: 60, variance: 60 },
  ];

  let coachMetricCount = 0;
  let memberMetricCount = 0;
  let entryCount = 0;

  // Helper to generate realistic progression
  const generateEntries = (
    metricId: string,
    memberId: string,
    baseValue: number,
    higherIsBetter: boolean,
    numEntries: number,
    daysSpan: number
  ) => {
    const entries: { metricId: string; memberId: string; date: Date; value: number; note: string | null }[] = [];
    let currentValue = baseValue;

    for (let i = 0; i < numEntries; i++) {
      const daysAgo = Math.floor((daysSpan / numEntries) * (numEntries - i - 1));
      // Use UTC noon to avoid timezone boundary issues
      const entryDate = new Date(Date.UTC(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - daysAgo,
        12, 0, 0, 0
      ));

      // Progress in the "better" direction with some variance
      const progressDirection = higherIsBetter ? 1 : -1;
      const progressAmount = (Math.random() * 0.5 + 0.2) * progressDirection;
      const randomVariance = (Math.random() - 0.5) * 0.8;
      currentValue = currentValue + progressAmount + randomVariance;

      // Round appropriately
      const roundedValue = Math.round(currentValue * 10) / 10;

      entries.push({
        metricId,
        memberId,
        date: entryDate,
        value: roundedValue,
        note: i === 0 ? "Početna vrednost" : (i === numEntries - 1 && Math.random() > 0.5 ? "Novi PR! 💪" : null),
      });
    }

    return entries;
  };

  // ========== Coach-created metrics ==========
  // Coaches create metrics for some of their members (not all)
  const coachedMembers = createdMembers.filter(m => m.coachIndex !== null);

  // Coach 0 (MANJA) creates "Bench Press" and "Procenat masti" for 3 of their 5 members
  const manjaMembers = coachedMembers.filter(m => m.coachIndex === 0).slice(0, 3);
  for (const member of manjaMembers) {
    // Bench Press
    const benchTemplate = metricTemplates[0];
    const startBench = benchTemplate.baseValue + (Math.random() - 0.5) * benchTemplate.variance;
    const targetBench = Math.round(startBench * 1.2);

    const benchMetric = await prisma.customMetric.create({
      data: {
        memberId: member.id,
        createdByCoachId: coaches[0].id,
        name: benchTemplate.name,
        unit: benchTemplate.unit,
        targetValue: targetBench,
        referenceValue: Math.round(startBench),
        higherIsBetter: benchTemplate.higherIsBetter,
      },
    });
    coachMetricCount++;

    // Add entries based on activity level
    const entryCountForMember = member.activityLevel === "high" ? 12 : member.activityLevel === "medium" ? 8 : 4;
    const entries = generateEntries(benchMetric.id, member.id, startBench, true, entryCountForMember, 60);
    for (const entry of entries) {
      await prisma.metricEntry.create({ data: entry });
      entryCount++;
    }

    // Body fat % for some members
    if (member.activityLevel === "high" || member.activityLevel === "medium") {
      const fatTemplate = metricTemplates[3];
      const startFat = fatTemplate.baseValue + (Math.random() - 0.5) * fatTemplate.variance;
      const targetFat = Math.round(startFat * 0.85);

      const fatMetric = await prisma.customMetric.create({
        data: {
          memberId: member.id,
          createdByCoachId: coaches[0].id,
          name: fatTemplate.name,
          unit: fatTemplate.unit,
          targetValue: targetFat,
          referenceValue: Math.round(startFat * 10) / 10,
          higherIsBetter: fatTemplate.higherIsBetter,
        },
      });
      coachMetricCount++;

      const fatEntries = generateEntries(fatMetric.id, member.id, startFat, false, entryCountForMember, 60);
      for (const entry of fatEntries) {
        await prisma.metricEntry.create({ data: entry });
        entryCount++;
      }
    }
  }

  // Coach 1 (GATI) creates "Čučanj" and "Mrtvo dizanje" for 2 members
  const gatiMembers = coachedMembers.filter(m => m.coachIndex === 1).slice(0, 2);
  for (const member of gatiMembers) {
    // Squat
    const squatTemplate = metricTemplates[1];
    const startSquat = squatTemplate.baseValue + (Math.random() - 0.5) * squatTemplate.variance;
    const targetSquat = Math.round(startSquat * 1.25);

    const squatMetric = await prisma.customMetric.create({
      data: {
        memberId: member.id,
        createdByCoachId: coaches[1].id,
        name: squatTemplate.name,
        unit: squatTemplate.unit,
        targetValue: targetSquat,
        referenceValue: Math.round(startSquat),
        higherIsBetter: squatTemplate.higherIsBetter,
      },
    });
    coachMetricCount++;

    const entryCountForMember = member.activityLevel === "high" ? 10 : 6;
    const entries = generateEntries(squatMetric.id, member.id, startSquat, true, entryCountForMember, 45);
    for (const entry of entries) {
      await prisma.metricEntry.create({ data: entry });
      entryCount++;
    }

    // Deadlift
    const dlTemplate = metricTemplates[2];
    const startDl = dlTemplate.baseValue + (Math.random() - 0.5) * dlTemplate.variance;
    const targetDl = Math.round(startDl * 1.2);

    const dlMetric = await prisma.customMetric.create({
      data: {
        memberId: member.id,
        createdByCoachId: coaches[1].id,
        name: dlTemplate.name,
        unit: dlTemplate.unit,
        targetValue: targetDl,
        referenceValue: Math.round(startDl),
        higherIsBetter: dlTemplate.higherIsBetter,
      },
    });
    coachMetricCount++;

    const dlEntries = generateEntries(dlMetric.id, member.id, startDl, true, entryCountForMember, 45);
    for (const entry of dlEntries) {
      await prisma.metricEntry.create({ data: entry });
      entryCount++;
    }
  }

  // Coach 2 (NINA) creates "Vertikalni skok" for 2 members
  const ninaMembers = coachedMembers.filter(m => m.coachIndex === 2).slice(0, 2);
  for (const member of ninaMembers) {
    const jumpTemplate = metricTemplates[4];
    const startJump = jumpTemplate.baseValue + (Math.random() - 0.5) * jumpTemplate.variance;
    const targetJump = Math.round(startJump * 1.15);

    const jumpMetric = await prisma.customMetric.create({
      data: {
        memberId: member.id,
        createdByCoachId: coaches[2].id,
        name: jumpTemplate.name,
        unit: jumpTemplate.unit,
        targetValue: targetJump,
        referenceValue: Math.round(startJump),
        higherIsBetter: jumpTemplate.higherIsBetter,
      },
    });
    coachMetricCount++;

    const entryCountForMember = member.activityLevel === "high" ? 8 : 5;
    const entries = generateEntries(jumpMetric.id, member.id, startJump, true, entryCountForMember, 30);
    for (const entry of entries) {
      await prisma.metricEntry.create({ data: entry });
      entryCount++;
    }
  }

  // ========== Member-created metrics ==========
  // Some members create their own metrics (with or without coach)

  // STRUJA (no coach) tracks "Trčanje 5K" and "Plank izdržaj"
  const struja = createdMembers.find(m => m.memberId === "STRUJA");
  if (struja) {
    // 5K run time
    const runTemplate = metricTemplates[5];
    const startRun = runTemplate.baseValue + (Math.random() - 0.5) * runTemplate.variance;
    const targetRun = Math.round((startRun * 0.9) * 10) / 10;

    const runMetric = await prisma.customMetric.create({
      data: {
        memberId: struja.id,
        createdByCoachId: null, // Member created
        name: runTemplate.name,
        unit: runTemplate.unit,
        targetValue: targetRun,
        referenceValue: null, // Will use first entry
        higherIsBetter: runTemplate.higherIsBetter,
      },
    });
    memberMetricCount++;

    const runEntries = generateEntries(runMetric.id, struja.id, startRun, false, 8, 40);
    for (const entry of runEntries) {
      await prisma.metricEntry.create({ data: entry });
      entryCount++;
    }

    // Plank hold
    const plankTemplate = metricTemplates[7];
    const startPlank = plankTemplate.baseValue + (Math.random() - 0.5) * plankTemplate.variance;

    const plankMetric = await prisma.customMetric.create({
      data: {
        memberId: struja.id,
        createdByCoachId: null,
        name: plankTemplate.name,
        unit: plankTemplate.unit,
        targetValue: 120, // 2 minute goal
        referenceValue: null,
        higherIsBetter: plankTemplate.higherIsBetter,
      },
    });
    memberMetricCount++;

    const plankEntries = generateEntries(plankMetric.id, struja.id, startPlank, true, 6, 30);
    for (const entry of plankEntries) {
      await prisma.metricEntry.create({ data: entry });
      entryCount++;
    }
  }

  // TEST member tracks "Pokretljivost kukova" (no target set - neutral display)
  const testMember = createdMembers.find(m => m.memberId === "TEST");
  if (testMember) {
    const hipTemplate = metricTemplates[6];
    const startHip = hipTemplate.baseValue + (Math.random() - 0.5) * hipTemplate.variance;

    const hipMetric = await prisma.customMetric.create({
      data: {
        memberId: testMember.id,
        createdByCoachId: null,
        name: hipTemplate.name,
        unit: hipTemplate.unit,
        targetValue: null, // No target - neutral semaphore
        referenceValue: null,
        higherIsBetter: hipTemplate.higherIsBetter,
      },
    });
    memberMetricCount++;

    const hipEntries = generateEntries(hipMetric.id, testMember.id, startHip, true, 5, 25);
    for (const entry of hipEntries) {
      await prisma.metricEntry.create({ data: entry });
      entryCount++;
    }
  }

  // One coached member (SD03) also creates their own metric in addition to coach ones
  const sd03 = createdMembers.find(m => m.memberId === "SD03");
  if (sd03) {
    const plankTemplate = metricTemplates[7];
    const startPlank = plankTemplate.baseValue + (Math.random() - 0.5) * plankTemplate.variance;

    const plankMetric = await prisma.customMetric.create({
      data: {
        memberId: sd03.id,
        createdByCoachId: null, // Member created their own
        name: plankTemplate.name,
        unit: plankTemplate.unit,
        targetValue: 90,
        referenceValue: null,
        higherIsBetter: plankTemplate.higherIsBetter,
      },
    });
    memberMetricCount++;

    const plankEntries = generateEntries(plankMetric.id, sd03.id, startPlank, true, 7, 35);
    for (const entry of plankEntries) {
      await prisma.metricEntry.create({ data: entry });
      entryCount++;
    }
  }

  // II07 (coached by GATI) creates their own "Procenat masti" metric
  const ii07 = createdMembers.find(m => m.memberId === "II07");
  if (ii07) {
    const fatTemplate = metricTemplates[3];
    const startFat = 18 + (Math.random() - 0.5) * 6; // Female range

    const fatMetric = await prisma.customMetric.create({
      data: {
        memberId: ii07.id,
        createdByCoachId: null,
        name: fatTemplate.name,
        unit: fatTemplate.unit,
        targetValue: 16,
        referenceValue: Math.round(startFat * 10) / 10,
        higherIsBetter: fatTemplate.higherIsBetter,
      },
    });
    memberMetricCount++;

    const fatEntries = generateEntries(fatMetric.id, ii07.id, startFat, false, 10, 50);
    for (const entry of fatEntries) {
      await prisma.metricEntry.create({ data: entry });
      entryCount++;
    }
  }

  console.log(`  ✅ Created ${coachMetricCount} coach-created metrics`);
  console.log(`  ✅ Created ${memberMetricCount} member-created metrics`);
  console.log(`  ✅ Added ${entryCount} metric entries`);
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

  console.log("\n  📊 METRICS DISTRIBUTION:");
  console.log("  ┌──────────────────────────────────────────────────────────────────┐");
  console.log("  │ Coach-Created Metrics:                                           │");
  console.log("  │ ├─ MANJA: Bench Press + Body Fat % for MJ01, AN02, SD03          │");
  console.log("  │ ├─ GATI:  Čučanj + Mrtvo dizanje for MP06, II07                  │");
  console.log("  │ └─ NINA:  Vertikalni skok for SM11, PP12                         │");
  console.log("  │                                                                  │");
  console.log("  │ Member-Created Metrics:                                          │");
  console.log("  │ ├─ STRUJA: Trčanje 5K + Plank izdržaj (no coach)                 │");
  console.log("  │ ├─ TEST:   Pokretljivost kukova (no target - neutral)            │");
  console.log("  │ ├─ SD03:   Plank izdržaj (own metric + coach metrics)            │");
  console.log("  │ └─ II07:   Procenat masti (own metric, has coach)                │");
  console.log("  │                                                                  │");
  console.log("  │ Members WITHOUT metrics: CEPA, NEW1, NEW2, NS05, AZ14, etc.      │");
  console.log("  └──────────────────────────────────────────────────────────────────┘");

  console.log("\n  📋 TEST SCENARIOS:");
  console.log("  • Admin coach performance: Login as S-ADMIN, check /api/admin/coach-performance");
  console.log("  • Coach dashboard: Login as any coach to see assigned member stats");
  console.log("  • New member onboarding: Login as CEPA, NEW01, or NEW02");
  console.log("  • Coach request flow: Login as STRUJA or TEST (no coach assigned)");
  console.log("  • Expired subscription: M14 has expired status");
  console.log("  • Trial members: M09, NEW01, NEW02 are on trial");
  console.log("  • Metrics (coach view): Login as MANJA, view MJ01's metrics");
  console.log("  • Metrics (member view): Login as STRUJA to see own metrics");
  console.log("  • Metrics (no target): Login as TEST to see neutral semaphore");
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
