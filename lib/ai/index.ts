import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a helpful gym coach assistant for Classic Gym members. Your role is to:

1. Explain progress and data in simple, plain language
2. Provide encouraging but honest feedback
3. Help members understand nutrition and training fundamentals
4. Offer one focused suggestion when appropriate

RULES:
- Keep responses brief (2-3 sentences max)
- Use plain language, no jargon
- Never give medical advice or diagnose
- Never prescribe specific meal plans or diets
- Never recommend specific supplement dosages
- Always reference the user's actual data when relevant
- Be encouraging but not excessive
- Focus on education and understanding
- When asked about supplements, provide general education only

TONE:
- Calm and supportive
- Like a knowledgeable gym coach
- Never guilt or shame
- Celebrate consistency over perfection`;

interface ChatContext {
  memberName: string;
  goal: string;
  currentWeight: number | null;
  streak: number;
  // Calories
  todayCalories: number;
  targetCalories: number;
  // Macros
  todayProtein: number;
  targetProtein: number;
  todayCarbs: number;
  targetCarbs: number;
  todayFats: number;
  targetFats: number;
  // Activity & Hydration
  trainedToday: boolean;
  weeklyTrainingSessions: number;
  waterGlasses: number;
  // Consistency
  consistencyScore: number;
  weeklyCheckins: Array<{ weight: number; feeling: number; weekNumber: number }>;
}

export function buildContextPrompt(context: ChatContext): string {
  const weightTrend = context.weeklyCheckins.length >= 2
    ? context.weeklyCheckins[0].weight - context.weeklyCheckins[1].weight
    : null;

  // Calculate calorie status
  const caloriePercent = Math.round((context.todayCalories / context.targetCalories) * 100);
  const isOverCalories = context.todayCalories > context.targetCalories;
  const calorieStatus = isOverCalories
    ? `OVER by ${context.todayCalories - context.targetCalories} kcal`
    : `${caloriePercent}% of target`;

  // Calculate macro percentages vs targets
  const proteinPercent = context.targetProtein > 0 ? Math.round((context.todayProtein / context.targetProtein) * 100) : 0;
  const carbsPercent = context.targetCarbs > 0 ? Math.round((context.todayCarbs / context.targetCarbs) * 100) : 0;
  const fatsPercent = context.targetFats > 0 ? Math.round((context.todayFats / context.targetFats) * 100) : 0;

  // Water status (8 glasses is ideal)
  const waterStatus = context.waterGlasses >= 8 ? "Good" : context.waterGlasses >= 4 ? "OK" : "Low";

  // Consistency interpretation
  const consistencyLabel = context.consistencyScore >= 80 ? "Excellent"
    : context.consistencyScore >= 60 ? "Good"
    : context.consistencyScore >= 40 ? "Needs improvement"
    : "Poor";

  return `
MEMBER CONTEXT:
- Name: ${context.memberName}
- Goal: ${context.goal.replace("_", " ")}
- Current weight: ${context.currentWeight || "not recorded"} kg

TODAY'S NUTRITION:
- Calories: ${context.todayCalories} of ${context.targetCalories} target (${calorieStatus})
- Protein: ${context.todayProtein}g of ${context.targetProtein}g target (${proteinPercent}%)
- Carbs: ${context.todayCarbs}g of ${context.targetCarbs}g target (${carbsPercent}%)
- Fats: ${context.todayFats}g of ${context.targetFats}g target (${fatsPercent}%)

ACTIVITY & HYDRATION:
- Trained today: ${context.trainedToday ? "Yes" : "No"}
- Weekly training sessions: ${context.weeklyTrainingSessions} (last 7 days)
- Water intake: ${context.waterGlasses} glasses (${waterStatus})

CONSISTENCY:
- Consistency score: ${context.consistencyScore}/100 (${consistencyLabel})
- Logging streak: ${context.streak} days
${weightTrend !== null ? `- Weight trend: ${weightTrend > 0 ? "+" : ""}${weightTrend.toFixed(1)} kg from last week` : ""}

IMPORTANT: Base your advice on the actual data above. If the member is over calories, acknowledge it. If protein is low, mention it. Be specific and reference their actual numbers.
`;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIResponse {
  text: string;
  tokensIn: number;
  tokensOut: number;
  error?: boolean;
}

export async function generateAIResponse(
  messages: ChatMessage[],
  context: ChatContext
): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      text: "I'm currently unable to respond. Please try again later.",
      tokensIn: 0,
      tokensOut: 0,
      error: true,
    };
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      system: SYSTEM_PROMPT + "\n" + buildContextPrompt(context),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const text = textBlock?.text || "I'm not sure how to respond to that.";

    return {
      text,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("AI response error:", error);
    return {
      text: "I'm having trouble connecting right now. Please try again.",
      tokensIn: 0,
      tokensOut: 0,
      error: true,
    };
  }
}

// Generate a generic response for cache seeding (without member context)
export async function generateGenericResponse(query: string): Promise<string> {
  const genericContext: ChatContext = {
    memberName: "Member",
    goal: "recomposition",
    currentWeight: 75,
    streak: 7,
    todayCalories: 1500,
    targetCalories: 2000,
    todayProtein: 100,
    targetProtein: 140,
    todayCarbs: 150,
    targetCarbs: 200,
    todayFats: 50,
    targetFats: 60,
    trainedToday: false,
    weeklyTrainingSessions: 3,
    waterGlasses: 5,
    consistencyScore: 70,
    weeklyCheckins: [],
  };

  const response = await generateAIResponse(
    [{ role: "user", content: query }],
    genericContext
  );

  return response.text;
}

export const SUGGESTED_PROMPTS = [
  "Why is my progress slow?",
  "What should I focus on this week?",
  "Is my macro balance okay?",
  "Why do I feel tired?",
  "Should I consider supplements?",
];
