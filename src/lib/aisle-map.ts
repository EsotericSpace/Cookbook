export const AISLE_MAP: Record<string, string> = {
  "onion": "produce", "garlic": "produce", "tomato": "produce",
  "avocado": "produce", "lemon": "produce", "lime": "produce",
  "blueberries": "produce", "blueberry": "produce", "cilantro": "produce",
  "basil": "produce", "parsley": "produce", "ginger": "produce",
  "bell pepper": "produce", "spinach": "produce", "mushroom": "produce",
  "potato": "produce", "carrot": "produce", "celery": "produce",
  "zucchini": "produce", "berries": "produce",

  "egg": "dairy & eggs", "butter": "dairy & eggs", "milk": "dairy & eggs",
  "heavy cream": "dairy & eggs", "cream cheese": "dairy & eggs",
  "sour cream": "dairy & eggs", "cheese": "dairy & eggs",
  "yogurt": "dairy & eggs", "buttermilk": "dairy & eggs",
  "parmesan": "dairy & eggs", "mozzarella": "dairy & eggs", "feta": "dairy & eggs",

  "chicken": "meat & seafood", "beef": "meat & seafood", "pork": "meat & seafood",
  "shrimp": "meat & seafood", "salmon": "meat & seafood", "turkey": "meat & seafood",
  "sausage": "meat & seafood", "bacon": "meat & seafood",

  "flour": "pantry", "sugar": "pantry", "salt": "pantry",
  "olive oil": "pantry", "vegetable oil": "pantry", "coconut oil": "pantry",
  "vanilla": "pantry", "baking soda": "pantry", "baking powder": "pantry",
  "cinnamon": "pantry", "cumin": "pantry", "paprika": "pantry",
  "cayenne": "pantry", "pepper": "pantry", "oregano": "pantry",
  "rice": "pantry", "pasta": "pantry", "oats": "pantry",
  "chia seeds": "pantry", "honey": "pantry", "maple syrup": "pantry",
  "vinegar": "pantry", "soy sauce": "pantry", "fish sauce": "pantry",

  "crushed tomatoes": "canned & jarred", "coconut milk": "canned & jarred",
  "beans": "canned & jarred", "broth": "canned & jarred",
  "tomato paste": "canned & jarred", "diced tomatoes": "canned & jarred",
  "curry paste": "canned & jarred",

  "bread": "bread & bakery", "sourdough": "bread & bakery",
  "tortilla": "bread & bakery", "pita": "bread & bakery",
}

export function assignAisle(itemName: string): string {
  const lower = itemName.toLowerCase()
  const keys = Object.keys(AISLE_MAP).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (lower.includes(key)) return AISLE_MAP[key]
  }
  return "other"
}
