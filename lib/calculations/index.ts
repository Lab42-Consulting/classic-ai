import { StatusType } from "@/components/ui/status-indicator";

export type Goal = "fat_loss" | "muscle_gain" | "recomposition";
export type MealSize = "small" | "medium" | "large";

interface DailyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MacroEstimate {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const GOAL_CALORIE_MULTIPLIERS: Record<Goal, { min: number; max: number }> = {
  fat_loss: { min: 10, max: 12 },
  recomposition: { min: 13, max: 15 },
  muscle_gain: { min: 16, max: 18 },
};

const GOAL_MACRO_SPLITS: Record<Goal, { protein: number; carbs: number; fats: number }> = {
  fat_loss: { protein: 0.40, carbs: 0.30, fats: 0.30 },
  recomposition: { protein: 0.35, carbs: 0.40, fats: 0.25 },
  muscle_gain: { protein: 0.30, carbs: 0.45, fats: 0.25 },
};

const MEAL_SIZE_CALORIES: Record<Goal, Record<MealSize, number>> = {
  fat_loss: { small: 300, medium: 500, large: 750 },
  recomposition: { small: 350, medium: 600, large: 900 },
  muscle_gain: { small: 400, medium: 700, large: 1000 },
};

export function calculateDailyTargets(weightKg: number, goal: Goal): DailyTargets {
  const multiplier = GOAL_CALORIE_MULTIPLIERS[goal];
  const avgMultiplier = (multiplier.min + multiplier.max) / 2;

  const calories = Math.round(weightKg * 2.205 * avgMultiplier);
  const splits = GOAL_MACRO_SPLITS[goal];

  const protein = Math.round((calories * splits.protein) / 4);
  const carbs = Math.round((calories * splits.carbs) / 4);
  const fats = Math.round((calories * splits.fats) / 9);

  return { calories, protein, carbs, fats };
}

export function estimateMealMacros(size: MealSize, goal: Goal): MacroEstimate {
  const calories = MEAL_SIZE_CALORIES[goal][size];
  const splits = GOAL_MACRO_SPLITS[goal];

  const protein = Math.round((calories * splits.protein) / 4);
  const carbs = Math.round((calories * splits.carbs) / 4);
  const fats = Math.round((calories * splits.fats) / 9);

  return { calories, protein, carbs, fats };
}

interface DailyProgress {
  consumedCalories: number;
  consumedProtein: number;
  consumedCarbs: number;
  consumedFats: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  trainedToday: boolean;
  waterGlasses: number;
}

export function calculateDailyStatus(progress: DailyProgress): StatusType {
  const calorieProgress = progress.consumedCalories / progress.targetCalories;
  const proteinProgress = progress.consumedProtein / progress.targetProtein;

  const currentHour = new Date().getHours();
  const expectedProgress = Math.min(1, currentHour / 20);

  const isTrainingDay = progress.trainedToday;
  const hasMinWater = progress.waterGlasses >= 4;

  if (
    calorieProgress >= expectedProgress * 0.8 &&
    calorieProgress <= 1.1 &&
    proteinProgress >= expectedProgress * 0.7 &&
    (isTrainingDay || hasMinWater)
  ) {
    return "on_track";
  }

  if (
    calorieProgress > 1.2 ||
    proteinProgress < expectedProgress * 0.5 ||
    (currentHour > 14 && calorieProgress < 0.3)
  ) {
    return "off_track";
  }

  return "needs_attention";
}

export function calculateMacroStatus(
  consumed: number,
  target: number
): StatusType {
  const ratio = consumed / target;

  if (ratio >= 0.9 && ratio <= 1.1) {
    return "on_track";
  }

  if (ratio < 0.7 || ratio > 1.3) {
    return "off_track";
  }

  return "needs_attention";
}

export function calculateStreak(logDates: Date[]): number {
  if (logDates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedDates = logDates
    .map((d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
    .sort((a, b) => b - a);

  const uniqueDates = [...new Set(sortedDates)];

  let streak = 0;
  let currentDate = today.getTime();

  for (const logDate of uniqueDates) {
    if (logDate === currentDate) {
      streak++;
      currentDate -= 24 * 60 * 60 * 1000;
    } else if (logDate === currentDate - 24 * 60 * 60 * 1000) {
      currentDate = logDate;
      streak++;
      currentDate -= 24 * 60 * 60 * 1000;
    } else if (logDate < currentDate - 24 * 60 * 60 * 1000) {
      break;
    }
  }

  return streak;
}

// Consistency score calculation (0-100)
// Based on: training frequency, calorie adherence, protein intake
interface ConsistencyInput {
  // Last 7 days data (or available days if less)
  trainingSessions: number; // Number of training sessions
  daysWithMeals: number; // Days where meals were logged
  avgCalorieAdherence: number; // Average % of target calories hit (0-100+)
  avgProteinAdherence: number; // Average % of target protein hit (0-100+)
  waterConsistency: number; // Days with 4+ glasses of water
  availableDays?: number; // Number of days the member has been active (1-7), defaults to 7
}

export function calculateConsistencyScore(input: ConsistencyInput): number {
  // Normalize based on available days (for new members who signed up mid-week)
  // If member signed up 3 days ago, we evaluate based on 3 days, not 7
  const daysToEvaluate = Math.min(7, Math.max(1, input.availableDays ?? 7));

  // Training component (0-30 points)
  // Normalize expectation: 3 sessions per 7 days = ~0.43 per day
  // For 3 days, expect 1-2 sessions for full score
  const expectedTrainingSessions = Math.max(1, Math.ceil(daysToEvaluate * (3 / 7)));
  const trainingRatio = Math.min(1, input.trainingSessions / expectedTrainingSessions);
  const trainingScore = trainingRatio * 30;

  // Logging consistency component (0-20 points)
  // Full score if logged all available days
  const loggingScore = Math.min(20, (input.daysWithMeals / daysToEvaluate) * 20);

  // Calorie adherence component (0-25 points)
  // Perfect = 80-120% of target, score based on how close to 100%
  // Only apply if there's data (daysWithMeals > 0)
  let calorieScore = 0;
  if (input.daysWithMeals > 0) {
    const calorieDeviation = Math.abs(100 - input.avgCalorieAdherence);
    calorieScore = Math.max(0, 25 - calorieDeviation * 0.5);
  }

  // Protein adherence component (0-15 points)
  // 90%+ = full points, scales down from there
  // Only apply if there's data
  let proteinScore = 0;
  if (input.daysWithMeals > 0) {
    proteinScore = Math.min(15, input.avgProteinAdherence * 0.15);
  }

  // Water component (0-10 points)
  // Full score if logged water on all available days
  const waterScore = Math.min(10, (input.waterConsistency / daysToEvaluate) * 10);

  const total = Math.round(trainingScore + loggingScore + calorieScore + proteinScore + waterScore);

  return Math.min(100, Math.max(0, total));
}

// Helper to calculate available days for a member
export function calculateAvailableDays(
  memberCreatedAt: Date,
  weekResetAt: Date | null,
  mondayOfThisWeek: Date
): number {
  // Use weekResetAt if set, otherwise use createdAt
  const startDate = weekResetAt || memberCreatedAt;

  // Calculate days since start (but max 7, and at least 1)
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Also consider days passed this week (Mon-Sun)
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const daysPassedThisWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

  // If member started before this week's Monday, use full week
  if (startDate.getTime() < mondayOfThisWeek.getTime()) {
    return daysPassedThisWeek;
  }

  // Otherwise, use days since they started (or reset)
  return Math.min(daysSinceStart, daysPassedThisWeek, 7);
}

export function getConsistencyLevel(score: number): StatusType {
  if (score >= 70) return "on_track";
  if (score >= 40) return "needs_attention";
  return "off_track";
}

export function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return { week: weekNumber, year: d.getUTCFullYear() };
}

export function formatCalories(calories: number): string {
  if (calories >= 1000) {
    return `${(calories / 1000).toFixed(1)}k`;
  }
  return calories.toString();
}

export function calculateMacroPercentages(
  protein: number,
  carbs: number,
  fats: number
): { protein: number; carbs: number; fats: number } {
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatsCals = fats * 9;
  const total = proteinCals + carbsCals + fatsCals;

  if (total === 0) {
    return { protein: 0, carbs: 0, fats: 0 };
  }

  return {
    protein: Math.round((proteinCals / total) * 100),
    carbs: Math.round((carbsCals / total) * 100),
    fats: Math.round((fatsCals / total) * 100),
  };
}
