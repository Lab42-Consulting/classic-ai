// Portion units for ingredient input
export const PORTION_UNITS = [
  { value: "g", label: "g", labelFull: "grama" },
  { value: "kg", label: "kg", labelFull: "kilograma" },
  { value: "ml", label: "ml", labelFull: "mililitra" },
  { value: "L", label: "L", labelFull: "litra" },
  { value: "piece", label: "kom", labelFull: "komad" },
  { value: "slice", label: "parče", labelFull: "parče" },
  { value: "tbsp", label: "kašika", labelFull: "kašika" },
  { value: "tsp", label: "kašičica", labelFull: "kašičica" },
  { value: "cup", label: "šolja", labelFull: "šolja" },
] as const;

export type PortionUnit = (typeof PORTION_UNITS)[number]["value"];

// Helper to format portion for display/storage
export function formatPortion(amount: number, unit: string): string {
  // For pieces/slices, use space separator for readability
  if (["piece", "slice", "tbsp", "tsp", "cup"].includes(unit)) {
    const unitObj = PORTION_UNITS.find((u) => u.value === unit);
    return `${amount} ${unitObj?.label || unit}`;
  }
  // For metric units, no space (e.g., "150g")
  return `${amount}${unit}`;
}

// Helper to parse portion string back to amount + unit
export function parsePortion(portionSize: string): {
  amount: number;
  unit: PortionUnit;
} {
  const normalized = portionSize.toLowerCase().trim();

  // Try to match various patterns
  // Pattern 1: "150g", "100ml", "1.5kg", "500L"
  const metricMatch = normalized.match(
    /^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|gr|gram|grama|mililitar|mililitra|litar|litra)?$/i
  );
  if (metricMatch) {
    const amount = parseFloat(metricMatch[1].replace(",", "."));
    const unitStr = (metricMatch[2] || "g").toLowerCase();

    let unit: PortionUnit = "g";
    if (unitStr === "kg" || unitStr === "kilograma") unit = "kg";
    else if (unitStr === "ml" || unitStr.startsWith("mililitar")) unit = "ml";
    else if (unitStr === "l" || unitStr.startsWith("litar")) unit = "L";

    return { amount, unit };
  }

  // Pattern 2: "4 kom", "2 parče", "1 kašika", etc.
  const labelMatch = normalized.match(
    /^(\d+(?:[.,]\d+)?)\s*(kom|komad|komada|parče|parčeta|kašika|kašike|kašičica|kašičice|šolja|šolje|piece|pieces|slice|slices|tbsp|tsp|cup|cups)?$/i
  );
  if (labelMatch) {
    const amount = parseFloat(labelMatch[1].replace(",", "."));
    const unitStr = (labelMatch[2] || "").toLowerCase();

    let unit: PortionUnit = "piece";
    if (unitStr.startsWith("parč")) unit = "slice";
    else if (unitStr.startsWith("kašik") && !unitStr.includes("č"))
      unit = "tbsp";
    else if (unitStr.startsWith("kašič")) unit = "tsp";
    else if (unitStr.startsWith("šolj") || unitStr === "cup" || unitStr === "cups")
      unit = "cup";
    else if (unitStr === "tbsp") unit = "tbsp";
    else if (unitStr === "tsp") unit = "tsp";
    else if (unitStr === "slice" || unitStr === "slices") unit = "slice";

    return { amount, unit };
  }

  // Fallback: try to extract just the number
  const numberMatch = normalized.match(/^(\d+(?:[.,]\d+)?)/);
  if (numberMatch) {
    return {
      amount: parseFloat(numberMatch[1].replace(",", ".")),
      unit: "g",
    };
  }

  // Default fallback
  return { amount: 0, unit: "g" };
}
