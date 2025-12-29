import Anthropic from "@anthropic-ai/sdk";
import {
  NUTRITION_SYSTEM_PROMPT,
  NUTRITION_SUGGESTED_PROMPTS,
  NUTRITION_DEFAULT_TEMPLATE,
} from "./nutrition";
import {
  SUPPLEMENTS_SYSTEM_PROMPT,
  SUPPLEMENTS_SUGGESTED_PROMPTS,
  SUPPLEMENTS_DEFAULT_TEMPLATE,
} from "./supplements";
import {
  TRAINING_SYSTEM_PROMPT,
  TRAINING_SUGGESTED_PROMPTS,
  TRAINING_DEFAULT_TEMPLATE,
} from "./training";

export type AgentType = "nutrition" | "supplements" | "training";

export const AGENT_PROMPTS = {
  nutrition: NUTRITION_SYSTEM_PROMPT,
  supplements: SUPPLEMENTS_SYSTEM_PROMPT,
  training: TRAINING_SYSTEM_PROMPT,
} as const;

export const AGENT_SUGGESTED_PROMPTS = {
  nutrition: NUTRITION_SUGGESTED_PROMPTS,
  supplements: SUPPLEMENTS_SUGGESTED_PROMPTS,
  training: TRAINING_SUGGESTED_PROMPTS,
} as const;

export const AGENT_DEFAULT_TEMPLATES = {
  nutrition: NUTRITION_DEFAULT_TEMPLATE,
  supplements: SUPPLEMENTS_DEFAULT_TEMPLATE,
  training: TRAINING_DEFAULT_TEMPLATE,
} as const;

export interface AgentChatContext {
  memberName: string;
  goal: string;
  currentWeight: number | null;
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
  // Activity
  trainedToday: boolean;
  weeklyTrainingSessions: number;
  waterGlasses: number;
  // Consistency
  consistencyScore: number;
}

export interface AgentChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentResponse {
  text: string;
  tokensIn: number;
  tokensOut: number;
  error?: boolean;
}

function buildAgentContextPrompt(context: AgentChatContext): string {
  const caloriePercent = Math.round((context.todayCalories / context.targetCalories) * 100);
  const isOverCalories = context.todayCalories > context.targetCalories;
  const calorieStatus = isOverCalories
    ? `PREKO cilja za ${context.todayCalories - context.targetCalories} kcal`
    : `${caloriePercent}% cilja`;

  const proteinPercent = context.targetProtein > 0
    ? Math.round((context.todayProtein / context.targetProtein) * 100)
    : 0;
  const carbsPercent = context.targetCarbs > 0
    ? Math.round((context.todayCarbs / context.targetCarbs) * 100)
    : 0;
  const fatsPercent = context.targetFats > 0
    ? Math.round((context.todayFats / context.targetFats) * 100)
    : 0;

  const waterStatus = context.waterGlasses >= 8
    ? "Dobro"
    : context.waterGlasses >= 4
      ? "OK"
      : "Nisko";

  return `
KONTEKST ČLANA:
- Ime: ${context.memberName}
- Cilj: ${context.goal.replace("_", " ")}
- Trenutna težina: ${context.currentWeight || "nije uneta"} kg

DANAŠNJA ISHRANA:
- Kalorije: ${context.todayCalories} od ${context.targetCalories} (${calorieStatus})
- Proteini: ${context.todayProtein}g od ${context.targetProtein}g (${proteinPercent}%)
- UH: ${context.todayCarbs}g od ${context.targetCarbs}g (${carbsPercent}%)
- Masti: ${context.todayFats}g od ${context.targetFats}g (${fatsPercent}%)

AKTIVNOST:
- Trenirao danas: ${context.trainedToday ? "Da" : "Ne"}
- Treninga ove nedelje: ${context.weeklyTrainingSessions}
- Vode: ${context.waterGlasses} čaša (${waterStatus})

DOSLEDNOST: ${context.consistencyScore}/100

VAŽNO: Koristi ove podatke u odgovoru kada su relevantni.`;
}

export async function generateAgentResponse(
  agentType: AgentType,
  messages: AgentChatMessage[],
  context: AgentChatContext,
  coachKnowledge?: string | null
): Promise<AgentResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      text: "Trenutno ne mogu da odgovorim. Pokušaj ponovo kasnije.",
      tokensIn: 0,
      tokensOut: 0,
      error: true,
    };
  }

  try {
    const client = new Anthropic({ apiKey });

    // Build the complete system prompt
    let systemPrompt = AGENT_PROMPTS[agentType];

    // Add coach knowledge if available
    if (coachKnowledge) {
      systemPrompt += `

SPECIFIČNE SMERNICE TRENERA ZA OVOG ČLANA:
${coachKnowledge}

VAŽNO: Uključi ove smernice trenera u svoje odgovore kada su relevantne.`;
    }

    // Add member context
    systemPrompt += "\n" + buildAgentContextPrompt(context);

    const response = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const text = textBlock?.text || "Nisam siguran kako da odgovorim na to.";

    return {
      text,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("Agent response error:", error);
    return {
      text: "Imam problema sa konekcijom. Pokušaj ponovo.",
      tokensIn: 0,
      tokensOut: 0,
      error: true,
    };
  }
}

// Validate agent type
export function isValidAgentType(type: string): type is AgentType {
  return ["nutrition", "supplements", "training"].includes(type);
}
