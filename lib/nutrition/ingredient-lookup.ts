/**
 * Ingredient Lookup Utilities
 *
 * Provides functions to search the static ingredient database and calculate
 * nutritional values for specific portion sizes.
 */

import {
  INGREDIENTS_DB,
  IngredientData,
} from "@/knowledge/nutrition/ingredients-db";

export interface LookupResult {
  found: true;
  source: "database";
  ingredient: IngredientData;
  data: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

export interface LookupMiss {
  found: false;
}

export type IngredientLookupResult = LookupResult | LookupMiss;

/**
 * Extended unit type that includes all supported units
 */
export type ExtendedUnit = "g" | "kg" | "ml" | "L" | "piece" | "slice" | "tbsp" | "tsp" | "cup";

/**
 * Parse a portion size string into a numeric value and unit
 *
 * Handles formats like:
 * - "150g" or "150 g", "1.5kg"
 * - "100ml" or "100 ml", "1L"
 * - "4 kom", "2 parče"
 * - "2 kašika", "1 kašičica", "1 šolja"
 * - "150" (assumes grams)
 *
 * @returns The numeric amount and unit, or null if parsing fails
 */
export function parsePortionSize(
  portion: string
): { amount: number; unit: ExtendedUnit; amountInGrams?: number } | null {
  const normalized = portion.toLowerCase().trim();

  // Pattern 1: Metric units - "150g", "1.5kg", "100ml", "0.5L"
  const metricMatch = normalized.match(
    /^(\d+(?:[.,]\d+)?)\s*(g|gr|gram|grama|kg|kilograma|ml|mililitar|mililitra|l|litar|litra)?$/i
  );

  if (metricMatch) {
    const amount = parseFloat(metricMatch[1].replace(",", "."));
    const unitStr = (metricMatch[2] || "g").toLowerCase();

    let unit: ExtendedUnit = "g";
    let amountInGrams: number | undefined;

    if (unitStr === "kg" || unitStr === "kilograma") {
      unit = "kg";
      amountInGrams = amount * 1000;
    } else if (unitStr === "l" || unitStr.startsWith("litar")) {
      unit = "L";
      amountInGrams = amount * 1000; // Approximation for water-like liquids
    } else if (unitStr.startsWith("ml") || unitStr.startsWith("mililitar")) {
      unit = "ml";
      amountInGrams = amount; // 1ml ≈ 1g for water-like liquids
    } else {
      unit = "g";
      amountInGrams = amount;
    }

    return { amount, unit, amountInGrams };
  }

  // Pattern 2: Pieces/slices - "4 kom", "2 komada", "3 parče", "piece", etc.
  const pieceMatch = normalized.match(
    /^(\d+(?:[.,]\d+)?)\s*(kom|komad|komada|piece|pieces)?$/i
  );

  if (pieceMatch) {
    const amount = parseFloat(pieceMatch[1].replace(",", "."));
    return { amount, unit: "piece" };
  }

  // Pattern 3: Slices - "2 parče", "3 parčeta", "slice"
  const sliceMatch = normalized.match(
    /^(\d+(?:[.,]\d+)?)\s*(parče|parčeta|slice|slices)$/i
  );

  if (sliceMatch) {
    const amount = parseFloat(sliceMatch[1].replace(",", "."));
    return { amount, unit: "slice" };
  }

  // Pattern 4: Tablespoons - "2 kašika", "1 tbsp"
  const tbspMatch = normalized.match(
    /^(\d+(?:[.,]\d+)?)\s*(kašika|kašike|tbsp|tablespoon|tablespoons)$/i
  );

  if (tbspMatch) {
    const amount = parseFloat(tbspMatch[1].replace(",", "."));
    return { amount, unit: "tbsp", amountInGrams: amount * 15 };
  }

  // Pattern 5: Teaspoons - "1 kašičica", "2 tsp"
  const tspMatch = normalized.match(
    /^(\d+(?:[.,]\d+)?)\s*(kašičica|kašičice|tsp|teaspoon|teaspoons)$/i
  );

  if (tspMatch) {
    const amount = parseFloat(tspMatch[1].replace(",", "."));
    return { amount, unit: "tsp", amountInGrams: amount * 5 };
  }

  // Pattern 6: Cups - "1 šolja", "2 cup"
  const cupMatch = normalized.match(
    /^(\d+(?:[.,]\d+)?)\s*(šolja|šolje|cup|cups)$/i
  );

  if (cupMatch) {
    const amount = parseFloat(cupMatch[1].replace(",", "."));
    return { amount, unit: "cup", amountInGrams: amount * 240 };
  }

  // Fallback: Just a number, assume grams
  const numberMatch = normalized.match(/^(\d+(?:[.,]\d+)?)$/);
  if (numberMatch) {
    const amount = parseFloat(numberMatch[1].replace(",", "."));
    return { amount, unit: "g", amountInGrams: amount };
  }

  return null;
}

/**
 * Normalize a string for fuzzy matching
 * - Lowercase
 * - Remove diacritics (Serbian special characters)
 * - Trim whitespace
 */
function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/đ/g, "d")
    .replace(/ž/g, "z")
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/š/g, "s");
}

/**
 * Find an ingredient by name (exact or fuzzy match)
 *
 * Searches both primary names and aliases.
 * Case-insensitive and handles Serbian diacritics.
 */
export function findIngredient(searchTerm: string): IngredientData | null {
  const normalized = normalizeForSearch(searchTerm);

  // First, try exact match on name or aliases
  for (const ingredient of INGREDIENTS_DB) {
    if (normalizeForSearch(ingredient.name) === normalized) {
      return ingredient;
    }

    for (const alias of ingredient.aliases) {
      if (normalizeForSearch(alias) === normalized) {
        return ingredient;
      }
    }
  }

  // Then, try partial match (ingredient name contains search term or vice versa)
  for (const ingredient of INGREDIENTS_DB) {
    const ingredientNorm = normalizeForSearch(ingredient.name);
    if (ingredientNorm.includes(normalized) || normalized.includes(ingredientNorm)) {
      return ingredient;
    }

    for (const alias of ingredient.aliases) {
      const aliasNorm = normalizeForSearch(alias);
      if (aliasNorm.includes(normalized) || normalized.includes(aliasNorm)) {
        return ingredient;
      }
    }
  }

  return null;
}

/**
 * Search for ingredients matching a partial query
 *
 * Returns up to `limit` matching ingredients for autocomplete/suggestions.
 */
export function searchIngredients(
  query: string,
  limit: number = 10
): IngredientData[] {
  if (!query || query.length < 2) {
    return [];
  }

  const normalized = normalizeForSearch(query);
  const results: IngredientData[] = [];
  const seen = new Set<string>();

  for (const ingredient of INGREDIENTS_DB) {
    if (results.length >= limit) break;

    const ingredientNorm = normalizeForSearch(ingredient.name);

    // Check if name or any alias matches
    let matches = ingredientNorm.includes(normalized);

    if (!matches) {
      for (const alias of ingredient.aliases) {
        if (normalizeForSearch(alias).includes(normalized)) {
          matches = true;
          break;
        }
      }
    }

    if (matches && !seen.has(ingredient.name)) {
      results.push(ingredient);
      seen.add(ingredient.name);
    }
  }

  return results;
}

/**
 * Calculate nutritional values for a specific portion size
 *
 * @param ingredient - The ingredient data (with per100 values)
 * @param portionAmount - The portion amount (e.g., 150 for 150g)
 * @returns Calculated nutritional values for the portion
 */
export function calculatePortionValues(
  ingredient: IngredientData,
  portionAmount: number
): { calories: number; protein: number; carbs: number; fats: number } {
  const multiplier = portionAmount / 100;

  return {
    calories: Math.round(ingredient.per100.calories * multiplier),
    protein: Math.round(ingredient.per100.protein * multiplier),
    carbs: Math.round(ingredient.per100.carbs * multiplier),
    fats: Math.round(ingredient.per100.fats * multiplier),
  };
}

/**
 * Look up an ingredient by name and calculate values for a portion
 *
 * This is the main function used by the AI deduction endpoint.
 * It first checks the static database before falling back to AI.
 *
 * @param name - The ingredient name (e.g., "piletina", "chicken breast")
 * @param portionSize - The portion size string (e.g., "150g", "100ml")
 * @returns LookupResult if found, LookupMiss if not in database
 */
export function lookupIngredient(
  name: string,
  portionSize: string
): IngredientLookupResult {
  // Find the ingredient in the database
  const ingredient = findIngredient(name);
  if (!ingredient) {
    return { found: false };
  }

  // Parse the portion size
  const parsed = parsePortionSize(portionSize);
  if (!parsed) {
    return { found: false };
  }

  // For piece/slice units without a known gram equivalent, let AI handle it
  // These are context-dependent (e.g., 1 egg vs 1 slice of bread have different weights)
  if (!parsed.amountInGrams && (parsed.unit === "piece" || parsed.unit === "slice")) {
    return { found: false };
  }

  // Use amountInGrams if available, otherwise use the raw amount
  // This handles conversions like kg→g, tbsp→g, etc.
  const portionAmount = parsed.amountInGrams ?? parsed.amount;

  // Calculate values for the portion
  const data = calculatePortionValues(ingredient, portionAmount);

  return {
    found: true,
    source: "database",
    ingredient,
    data,
  };
}

/**
 * Get suggested portions for an ingredient
 *
 * Returns common portion sizes based on the ingredient type.
 * If the ingredient has typicalPortion defined (e.g., eggs by piece),
 * it will suggest those units instead of grams.
 */
export function getSuggestedPortions(
  ingredient: IngredientData
): { label: string; value: string }[] {
  // If ingredient has a typical portion defined (e.g., eggs, bread slices)
  // use that unit for suggestions
  if (ingredient.typicalPortion) {
    const { unit: portionUnit } = ingredient.typicalPortion;

    switch (portionUnit) {
      case "kom":
        return [
          { label: "1 kom", value: "1 kom" },
          { label: "2 kom", value: "2 kom" },
          { label: "3 kom", value: "3 kom" },
          { label: "4 kom", value: "4 kom" },
        ];
      case "parče":
        return [
          { label: "1 parče", value: "1 parče" },
          { label: "2 parče", value: "2 parče" },
          { label: "3 parče", value: "3 parče" },
        ];
      case "kašika":
        return [
          { label: "1 kašika", value: "1 kašika" },
          { label: "2 kašike", value: "2 kašike" },
          { label: "3 kašike", value: "3 kašike" },
        ];
      case "kašičica":
        return [
          { label: "1 kašičica", value: "1 kašičica" },
          { label: "2 kašičice", value: "2 kašičice" },
        ];
    }
  }

  const unit = ingredient.unit;

  if (unit === "ml") {
    return [
      { label: "100ml", value: "100ml" },
      { label: "200ml", value: "200ml" },
      { label: "250ml", value: "250ml" },
      { label: "500ml", value: "500ml" },
    ];
  }

  // For solid foods (grams)
  switch (ingredient.category) {
    case "protein":
      return [
        { label: "100g", value: "100g" },
        { label: "150g", value: "150g" },
        { label: "200g", value: "200g" },
      ];
    case "carbs":
      return [
        { label: "50g", value: "50g" },
        { label: "100g", value: "100g" },
        { label: "150g", value: "150g" },
      ];
    case "vegetables":
      return [
        { label: "50g", value: "50g" },
        { label: "100g", value: "100g" },
        { label: "150g", value: "150g" },
      ];
    case "fruits":
      return [
        { label: "100g", value: "100g" },
        { label: "150g", value: "150g" },
        { label: "200g", value: "200g" },
      ];
    case "fats":
      return [
        { label: "10g", value: "10g" },
        { label: "15g", value: "15g" },
        { label: "30g", value: "30g" },
      ];
    case "dairy":
      return [
        { label: "100g", value: "100g" },
        { label: "150g", value: "150g" },
        { label: "200g", value: "200g" },
      ];
    default:
      return [
        { label: "50g", value: "50g" },
        { label: "100g", value: "100g" },
        { label: "150g", value: "150g" },
      ];
  }
}
