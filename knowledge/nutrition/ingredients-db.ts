/**
 * Static Ingredient Database
 *
 * This database contains common ingredients with their nutritional values per 100g/100ml.
 * It serves as a cost-saving cache to avoid unnecessary AI API calls.
 *
 * Values are based on standard nutritional databases (USDA, Serbian food composition tables).
 * All values are per 100g (or 100ml for liquids).
 */

export interface IngredientData {
  name: string;
  aliases: string[]; // Alternative names (Serbian, English, common misspellings)
  per100: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  unit: "g" | "ml";
  category:
    | "protein"
    | "carbs"
    | "fats"
    | "dairy"
    | "vegetables"
    | "fruits"
    | "other";
  // Optional: specify how this ingredient is typically measured
  // Helps provide better portion suggestions (e.g., eggs as "kom" not "g")
  typicalPortion?: {
    unit: "g" | "ml" | "kom" | "parče" | "kašika" | "kašičica";
    amount: number; // Typical portion size in this unit
    gramsPerUnit?: number; // How many grams per 1 unit (for conversions)
  };
}

export const INGREDIENTS_DB: IngredientData[] = [
  // ========================================
  // PROTEINS
  // ========================================
  {
    name: "Pileća prsa",
    aliases: [
      "piletina",
      "chicken breast",
      "pileće belo meso",
      "pilece prsa",
      "pilece belo meso",
      "chicken",
    ],
    per100: { calories: 165, protein: 31, carbs: 0, fats: 4 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Pileći batak",
    aliases: ["chicken thigh", "pileci batak", "batak"],
    per100: { calories: 209, protein: 26, carbs: 0, fats: 11 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Ćuretina",
    aliases: ["turkey", "curetina", "ćureće meso", "curece meso"],
    per100: { calories: 135, protein: 30, carbs: 0, fats: 1 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Junetina",
    aliases: ["beef", "govedina", "junece meso", "juneće meso"],
    per100: { calories: 250, protein: 26, carbs: 0, fats: 15 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Mljevena junetina",
    aliases: [
      "ground beef",
      "mljeveno meso",
      "mleveno meso",
      "mlevena junetina",
    ],
    per100: { calories: 250, protein: 26, carbs: 0, fats: 15 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Svinjetina",
    aliases: ["pork", "svinjsko meso", "svinjsko"],
    per100: { calories: 242, protein: 27, carbs: 0, fats: 14 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Jagnjetina",
    aliases: ["lamb", "jagnjece meso", "jagnjeće meso"],
    per100: { calories: 294, protein: 25, carbs: 0, fats: 21 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Losos",
    aliases: ["salmon", "riba losos"],
    per100: { calories: 208, protein: 20, carbs: 0, fats: 13 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Tuna",
    aliases: ["tuna fish", "tunjevina"],
    per100: { calories: 132, protein: 28, carbs: 0, fats: 1 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Tuna u konzervi",
    aliases: ["canned tuna", "tuna konzerva", "tunjevina konzerva"],
    per100: { calories: 116, protein: 26, carbs: 0, fats: 1 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Skuša",
    aliases: ["mackerel", "skusa"],
    per100: { calories: 205, protein: 19, carbs: 0, fats: 14 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Oslić",
    aliases: ["hake", "oslic", "riba oslić"],
    per100: { calories: 82, protein: 18, carbs: 0, fats: 1 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Pastrmka",
    aliases: ["trout", "riba pastrmka"],
    per100: { calories: 148, protein: 21, carbs: 0, fats: 7 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Škampi",
    aliases: ["shrimp", "škampi", "skampi", "kozice", "gambori"],
    per100: { calories: 99, protein: 24, carbs: 0, fats: 0 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Jaja",
    aliases: ["eggs", "egg", "jaje", "kokošija jaja", "kokosija jaja", "jedno jaje", "egg single"],
    per100: { calories: 155, protein: 13, carbs: 1, fats: 11 },
    unit: "g",
    category: "protein",
    typicalPortion: { unit: "kom", amount: 1, gramsPerUnit: 50 }, // 1 medium egg ≈ 50g
  },
  {
    name: "Belance",
    aliases: ["egg white", "bjelance", "egg whites"],
    per100: { calories: 52, protein: 11, carbs: 1, fats: 0 },
    unit: "g",
    category: "protein",
    typicalPortion: { unit: "kom", amount: 1, gramsPerUnit: 33 }, // 1 egg white ≈ 33g
  },
  {
    name: "Tofu",
    aliases: ["sojin sir", "tofu sir"],
    per100: { calories: 76, protein: 8, carbs: 2, fats: 4 },
    unit: "g",
    category: "protein",
  },
  {
    name: "Tempeh",
    aliases: ["soja tempeh"],
    per100: { calories: 193, protein: 19, carbs: 9, fats: 11 },
    unit: "g",
    category: "protein",
  },

  // ========================================
  // DAIRY
  // ========================================
  {
    name: "Grčki jogurt",
    aliases: [
      "greek yogurt",
      "grcki jogurt",
      "jogurt grčki",
      "jogurt grcki",
      "greek yoghurt",
    ],
    per100: { calories: 97, protein: 9, carbs: 4, fats: 5 },
    unit: "g",
    category: "dairy",
  },
  {
    name: "Jogurt",
    aliases: ["yogurt", "plain yogurt", "obični jogurt", "obicni jogurt"],
    per100: { calories: 61, protein: 3, carbs: 5, fats: 3 },
    unit: "g",
    category: "dairy",
  },
  {
    name: "Kefir",
    aliases: ["kefir milk"],
    per100: { calories: 41, protein: 3, carbs: 4, fats: 1 },
    unit: "ml",
    category: "dairy",
  },
  {
    name: "Mleko",
    aliases: ["milk", "mlijeko", "kravlje mleko", "cow milk"],
    per100: { calories: 42, protein: 3, carbs: 5, fats: 1 },
    unit: "ml",
    category: "dairy",
  },
  {
    name: "Mleko (punomasno)",
    aliases: ["whole milk", "punomasno mleko", "full fat milk"],
    per100: { calories: 61, protein: 3, carbs: 5, fats: 3 },
    unit: "ml",
    category: "dairy",
  },
  {
    name: "Cottage sir",
    aliases: ["cottage cheese", "svježi sir", "svezi sir", "cottage"],
    per100: { calories: 98, protein: 11, carbs: 3, fats: 4 },
    unit: "g",
    category: "dairy",
  },
  {
    name: "Skuta",
    aliases: ["quark", "kvark", "svježi kravlji sir"],
    per100: { calories: 67, protein: 12, carbs: 4, fats: 0 },
    unit: "g",
    category: "dairy",
  },
  {
    name: "Mozzarella",
    aliases: ["mozzarella sir", "mocarela"],
    per100: { calories: 280, protein: 22, carbs: 2, fats: 21 },
    unit: "g",
    category: "dairy",
  },
  {
    name: "Parmezan",
    aliases: ["parmesan", "parmesan cheese", "parmigiano"],
    per100: { calories: 431, protein: 38, carbs: 4, fats: 29 },
    unit: "g",
    category: "dairy",
  },
  {
    name: "Feta sir",
    aliases: ["feta cheese", "feta"],
    per100: { calories: 264, protein: 14, carbs: 4, fats: 21 },
    unit: "g",
    category: "dairy",
  },
  {
    name: "Kajmak",
    aliases: ["clotted cream", "serbian cream"],
    per100: { calories: 305, protein: 3, carbs: 2, fats: 32 },
    unit: "g",
    category: "dairy",
  },
  {
    name: "Pavlaka",
    aliases: ["sour cream", "kisela pavlaka", "kiselo vrhnje"],
    per100: { calories: 193, protein: 3, carbs: 3, fats: 19 },
    unit: "g",
    category: "dairy",
  },

  // ========================================
  // CARBOHYDRATES
  // ========================================
  {
    name: "Beli pirinač (kuvan)",
    aliases: [
      "cooked rice",
      "riza",
      "pirinač",
      "pirinac",
      "white rice",
      "beli pirinac",
    ],
    per100: { calories: 130, protein: 3, carbs: 28, fats: 0 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Beli pirinač (suv)",
    aliases: ["dry rice", "suvi pirinac", "suvi pirinač"],
    per100: { calories: 360, protein: 7, carbs: 79, fats: 1 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Smeđi pirinač (kuvan)",
    aliases: ["brown rice", "integralni pirinac", "integralni pirinač"],
    per100: { calories: 112, protein: 3, carbs: 24, fats: 1 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Ovsene pahuljice",
    aliases: ["oats", "ovsena kaša", "zobene pahuljice", "oatmeal", "zobene"],
    per100: { calories: 389, protein: 17, carbs: 66, fats: 7 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Ovsena kaša (kuvana)",
    aliases: ["cooked oatmeal", "kuvana ovsena kasa", "porridge"],
    per100: { calories: 71, protein: 3, carbs: 12, fats: 2 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Hleb (beli)",
    aliases: ["white bread", "beli hleb", "bread", "hljeb"],
    per100: { calories: 265, protein: 9, carbs: 49, fats: 3 },
    unit: "g",
    category: "carbs",
    typicalPortion: { unit: "parče", amount: 1, gramsPerUnit: 30 }, // 1 slice ≈ 30g
  },
  {
    name: "Hleb (integralni)",
    aliases: [
      "whole wheat bread",
      "integralni hleb",
      "crni hleb",
      "wholemeal bread",
    ],
    per100: { calories: 247, protein: 13, carbs: 41, fats: 4 },
    unit: "g",
    category: "carbs",
    typicalPortion: { unit: "parče", amount: 1, gramsPerUnit: 30 }, // 1 slice ≈ 30g
  },
  {
    name: "Testenina (kuvana)",
    aliases: [
      "cooked pasta",
      "pasta",
      "špagete",
      "spagete",
      "makarone",
      "noodles",
    ],
    per100: { calories: 131, protein: 5, carbs: 25, fats: 1 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Testenina (suva)",
    aliases: ["dry pasta", "suva testenina"],
    per100: { calories: 371, protein: 13, carbs: 75, fats: 2 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Krompir (kuvan)",
    aliases: ["potato", "boiled potato", "kuvani krompir", "potatoes"],
    per100: { calories: 87, protein: 2, carbs: 20, fats: 0 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Batat (kuvan)",
    aliases: ["sweet potato", "slatki krompir", "batata"],
    per100: { calories: 86, protein: 2, carbs: 20, fats: 0 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Kvinoja (kuvana)",
    aliases: ["quinoa", "cooked quinoa", "kinoa"],
    per100: { calories: 120, protein: 4, carbs: 21, fats: 2 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Kukuruz (kuvan)",
    aliases: ["corn", "cooked corn", "kukuruz u zrnu", "sweetcorn"],
    per100: { calories: 96, protein: 3, carbs: 21, fats: 1 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Heljda (kuvana)",
    aliases: ["buckwheat", "kuvana heljda"],
    per100: { calories: 92, protein: 3, carbs: 20, fats: 1 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Bulgur (kuvan)",
    aliases: ["bulgur wheat", "kuvani bulgur"],
    per100: { calories: 83, protein: 3, carbs: 19, fats: 0 },
    unit: "g",
    category: "carbs",
  },
  {
    name: "Tortilla",
    aliases: ["tortilla wrap", "tortilja", "wrap"],
    per100: { calories: 312, protein: 8, carbs: 52, fats: 8 },
    unit: "g",
    category: "carbs",
  },

  // ========================================
  // VEGETABLES
  // ========================================
  {
    name: "Brokoli",
    aliases: ["broccoli", "brokula"],
    per100: { calories: 34, protein: 3, carbs: 7, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Spanać",
    aliases: ["spinach", "spanac"],
    per100: { calories: 23, protein: 3, carbs: 4, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Tikvice",
    aliases: ["zucchini", "courgette", "tikvica"],
    per100: { calories: 17, protein: 1, carbs: 3, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Paprika",
    aliases: ["bell pepper", "pepper", "sweet pepper"],
    per100: { calories: 31, protein: 1, carbs: 6, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Paradajz",
    aliases: ["tomato", "tomatoes", "rajčica"],
    per100: { calories: 18, protein: 1, carbs: 4, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Krastavac",
    aliases: ["cucumber", "krastavci"],
    per100: { calories: 15, protein: 1, carbs: 4, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Mrkva",
    aliases: ["carrot", "šargarepa", "sargarepa", "carrots"],
    per100: { calories: 41, protein: 1, carbs: 10, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Luk (crni)",
    aliases: ["onion", "crni luk", "onions"],
    per100: { calories: 40, protein: 1, carbs: 9, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Beli luk",
    aliases: ["garlic", "češnjak", "cesnjak"],
    per100: { calories: 149, protein: 6, carbs: 33, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Zelena salata",
    aliases: ["lettuce", "salata", "iceberg", "zelena"],
    per100: { calories: 14, protein: 1, carbs: 2, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Kupus",
    aliases: ["cabbage", "zeleni kupus"],
    per100: { calories: 25, protein: 1, carbs: 6, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Karfiol",
    aliases: ["cauliflower", "cvjetača", "cvetaca"],
    per100: { calories: 25, protein: 2, carbs: 5, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Šampinjoni",
    aliases: ["mushrooms", "champignon", "pecurke", "gljive", "sampinjoni"],
    per100: { calories: 22, protein: 3, carbs: 3, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Patlidžan",
    aliases: ["eggplant", "aubergine", "plavi patlidzan"],
    per100: { calories: 25, protein: 1, carbs: 6, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Grašak",
    aliases: ["peas", "green peas", "zeleni grašak", "grasak"],
    per100: { calories: 81, protein: 5, carbs: 14, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Pasulj (kuvan)",
    aliases: ["beans", "cooked beans", "beli pasulj", "grah"],
    per100: { calories: 127, protein: 9, carbs: 23, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Sočivo (kuvano)",
    aliases: ["lentils", "cooked lentils", "leća"],
    per100: { calories: 116, protein: 9, carbs: 20, fats: 0 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Leblebije (kuvane)",
    aliases: ["chickpeas", "cooked chickpeas", "slanutak", "naut"],
    per100: { calories: 164, protein: 9, carbs: 27, fats: 3 },
    unit: "g",
    category: "vegetables",
  },
  {
    name: "Avokado",
    aliases: ["avocado"],
    per100: { calories: 160, protein: 2, carbs: 9, fats: 15 },
    unit: "g",
    category: "vegetables",
  },

  // ========================================
  // FRUITS
  // ========================================
  {
    name: "Banana",
    aliases: ["bananas"],
    per100: { calories: 89, protein: 1, carbs: 23, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Jabuka",
    aliases: ["apple", "apples"],
    per100: { calories: 52, protein: 0, carbs: 14, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Narandža",
    aliases: ["orange", "oranges", "pomorandža", "pomorandza"],
    per100: { calories: 47, protein: 1, carbs: 12, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Jagode",
    aliases: ["strawberries", "strawberry", "jagoda"],
    per100: { calories: 32, protein: 1, carbs: 8, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Borovnice",
    aliases: ["blueberries", "blueberry", "borovnica"],
    per100: { calories: 57, protein: 1, carbs: 14, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Maline",
    aliases: ["raspberries", "raspberry", "malina"],
    per100: { calories: 52, protein: 1, carbs: 12, fats: 1 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Grožđe",
    aliases: ["grapes", "grape", "grozdze"],
    per100: { calories: 69, protein: 1, carbs: 18, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Lubenica",
    aliases: ["watermelon"],
    per100: { calories: 30, protein: 1, carbs: 8, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Dinja",
    aliases: ["melon", "cantaloupe"],
    per100: { calories: 34, protein: 1, carbs: 8, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Ananas",
    aliases: ["pineapple"],
    per100: { calories: 50, protein: 1, carbs: 13, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Mango",
    aliases: [],
    per100: { calories: 60, protein: 1, carbs: 15, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Kruška",
    aliases: ["pear", "pears", "kruske"],
    per100: { calories: 57, protein: 0, carbs: 15, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Breskva",
    aliases: ["peach", "peaches"],
    per100: { calories: 39, protein: 1, carbs: 10, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Šljiva",
    aliases: ["plum", "plums", "sljiva"],
    per100: { calories: 46, protein: 1, carbs: 11, fats: 0 },
    unit: "g",
    category: "fruits",
  },
  {
    name: "Kivi",
    aliases: ["kiwi", "kiwifruit"],
    per100: { calories: 61, protein: 1, carbs: 15, fats: 1 },
    unit: "g",
    category: "fruits",
  },

  // ========================================
  // FATS & OILS
  // ========================================
  {
    name: "Maslinovo ulje",
    aliases: ["olive oil", "ulje maslinovo"],
    per100: { calories: 884, protein: 0, carbs: 0, fats: 100 },
    unit: "ml",
    category: "fats",
  },
  {
    name: "Kokosovo ulje",
    aliases: ["coconut oil", "ulje kokosovo"],
    per100: { calories: 862, protein: 0, carbs: 0, fats: 100 },
    unit: "ml",
    category: "fats",
  },
  {
    name: "Suncokretovo ulje",
    aliases: ["sunflower oil", "ulje suncokretovo"],
    per100: { calories: 884, protein: 0, carbs: 0, fats: 100 },
    unit: "ml",
    category: "fats",
  },
  {
    name: "Maslac",
    aliases: ["butter", "puter"],
    per100: { calories: 717, protein: 1, carbs: 0, fats: 81 },
    unit: "g",
    category: "fats",
  },
  {
    name: "Bademi",
    aliases: ["almonds", "almond", "badem"],
    per100: { calories: 579, protein: 21, carbs: 22, fats: 50 },
    unit: "g",
    category: "fats",
  },
  {
    name: "Orasi",
    aliases: ["walnuts", "walnut", "orah"],
    per100: { calories: 654, protein: 15, carbs: 14, fats: 65 },
    unit: "g",
    category: "fats",
  },
  {
    name: "Kikiriki",
    aliases: ["peanuts", "peanut", "kikiriki"],
    per100: { calories: 567, protein: 26, carbs: 16, fats: 49 },
    unit: "g",
    category: "fats",
  },
  {
    name: "Kikiriki puter",
    aliases: ["peanut butter", "maslac od kikirikija"],
    per100: { calories: 588, protein: 25, carbs: 20, fats: 50 },
    unit: "g",
    category: "fats",
  },
  {
    name: "Lešnici",
    aliases: ["hazelnuts", "hazelnut", "lešnik", "lesnik"],
    per100: { calories: 628, protein: 15, carbs: 17, fats: 61 },
    unit: "g",
    category: "fats",
  },
  {
    name: "Indijski orasi",
    aliases: ["cashews", "cashew", "indijski orah"],
    per100: { calories: 553, protein: 18, carbs: 30, fats: 44 },
    unit: "g",
    category: "fats",
  },
  {
    name: "Semenke bundeve",
    aliases: [
      "pumpkin seeds",
      "bundeva semenke",
      "bučine semenke",
      "bucine semenke",
    ],
    per100: { calories: 559, protein: 30, carbs: 11, fats: 49 },
    unit: "g",
    category: "fats",
  },
  {
    name: "Semenke suncokreta",
    aliases: ["sunflower seeds", "suncokret semenke"],
    per100: { calories: 584, protein: 21, carbs: 20, fats: 51 },
    unit: "g",
    category: "fats",
  },
  {
    name: "Chia semenke",
    aliases: ["chia seeds", "chia"],
    per100: { calories: 486, protein: 17, carbs: 42, fats: 31 },
    unit: "g",
    category: "fats",
  },
  {
    name: "Lanene semenke",
    aliases: ["flax seeds", "flaxseed", "lan semenke"],
    per100: { calories: 534, protein: 18, carbs: 29, fats: 42 },
    unit: "g",
    category: "fats",
  },

  // ========================================
  // OTHER / SUPPLEMENTS
  // ========================================
  {
    name: "Med",
    aliases: ["honey"],
    per100: { calories: 304, protein: 0, carbs: 82, fats: 0 },
    unit: "g",
    category: "other",
  },
  {
    name: "Whey protein",
    aliases: [
      "whey",
      "protein powder",
      "protein prah",
      "surutka protein",
      "proteinski prah",
    ],
    per100: { calories: 400, protein: 80, carbs: 8, fats: 4 },
    unit: "g",
    category: "other",
  },
  {
    name: "Kazein protein",
    aliases: ["casein", "casein protein", "kazein"],
    per100: { calories: 370, protein: 85, carbs: 5, fats: 1 },
    unit: "g",
    category: "other",
  },
  {
    name: "Čokolada (tamna)",
    aliases: ["dark chocolate", "crna čokolada", "crna cokolada"],
    per100: { calories: 598, protein: 8, carbs: 46, fats: 43 },
    unit: "g",
    category: "other",
  },
  {
    name: "Čokolada (mlečna)",
    aliases: ["milk chocolate", "mlečna čokolada", "mlecna cokolada"],
    per100: { calories: 535, protein: 8, carbs: 59, fats: 30 },
    unit: "g",
    category: "other",
  },
  {
    name: "Humus",
    aliases: ["hummus", "humus namaz"],
    per100: { calories: 166, protein: 8, carbs: 14, fats: 10 },
    unit: "g",
    category: "other",
  },
  {
    name: "Džem",
    aliases: ["jam", "marmelada", "dzem"],
    per100: { calories: 250, protein: 0, carbs: 65, fats: 0 },
    unit: "g",
    category: "other",
  },
  {
    name: "Kakao prah",
    aliases: ["cocoa powder", "kakao"],
    per100: { calories: 228, protein: 20, carbs: 58, fats: 14 },
    unit: "g",
    category: "other",
  },
];

/**
 * Get all ingredient names for search suggestions
 */
export function getAllIngredientNames(): string[] {
  const names: string[] = [];
  for (const ing of INGREDIENTS_DB) {
    names.push(ing.name);
    names.push(...ing.aliases);
  }
  return [...new Set(names)].sort();
}

/**
 * Get ingredients by category
 */
export function getIngredientsByCategory(
  category: IngredientData["category"]
): IngredientData[] {
  return INGREDIENTS_DB.filter((ing) => ing.category === category);
}
