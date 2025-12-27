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
  todayCalories: number;
  targetCalories: number;
  todayProtein: number;
  targetProtein: number;
  trainedToday: boolean;
  weeklyCheckins: Array<{ weight: number; feeling: number; weekNumber: number }>;
}

export function buildContextPrompt(context: ChatContext): string {
  const weightTrend = context.weeklyCheckins.length >= 2
    ? context.weeklyCheckins[0].weight - context.weeklyCheckins[1].weight
    : null;

  return `
MEMBER CONTEXT:
- Name: ${context.memberName}
- Goal: ${context.goal.replace("_", " ")}
- Current weight: ${context.currentWeight || "not recorded"} kg
- Consistency streak: ${context.streak} days
- Today's calories: ${context.todayCalories} of ${context.targetCalories} target
- Today's protein: ${context.todayProtein}g of ${context.targetProtein}g target
- Trained today: ${context.trainedToday ? "Yes" : "No"}
${weightTrend !== null ? `- Weight trend: ${weightTrend > 0 ? "+" : ""}${weightTrend.toFixed(1)} kg from last week` : ""}
`;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateAIResponse(
  messages: ChatMessage[],
  context: ChatContext
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return "I'm currently unable to respond. Please try again later.";
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
    return textBlock?.text || "I'm not sure how to respond to that.";
  } catch (error) {
    console.error("AI response error:", error);
    return "I'm having trouble connecting right now. Please try again.";
  }
}

export const SUGGESTED_PROMPTS = [
  "Why is my progress slow?",
  "What should I focus on this week?",
  "Is my macro balance okay?",
  "Why do I feel tired?",
  "Should I consider supplements?",
];
