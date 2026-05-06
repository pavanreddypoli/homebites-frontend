// Safe to import from client or server — no SDK dependency.

export const PROHIBITED_KEYWORDS = {
  hard_block: {
    en: [
      "chicken", "beef", "pork", "lamb", "mutton", "goat", "veal", "turkey", "duck",
      "sausage", "bacon", "ham", "jerky", "salami", "pepperoni", "prosciutto",
      "fish", "salmon", "tuna", "cod", "tilapia", "mackerel", "sardine", "anchovy",
      "shrimp", "prawn", "lobster", "crab", "scallop", "oyster", "clam", "mussel",
      "ice cream", "gelato", "sorbet", "popsicle", "frozen yogurt",
      "raw milk", "unpasteurized",
      "cbd", "thc", "cannabis", "hemp oil",
    ],
    es: [
      "pollo", "res", "cerdo", "cordero", "carne", "jamon", "jamón", "tocino", "chorizo",
      "pescado", "mariscos", "camaron", "camarón", "langosta", "atun", "atún",
    ],
    hi_translit: [
      "murgh", "murg", "kukad", "kukkad",
      "gosht", "ghosht",
      "machhi", "machli", "meen",
      "jhinga",
    ],
  },
  flag_for_review: {
    en: [
      "biryani", "kebab", "kabab", "meatball", "kofta", "burger", "patty", "loaf",
    ],
    hi_translit: [
      "keema", "kheema", "qeema",
      "boti", "seekh",
    ],
  },
} as const;

export type KeywordCheckResult =
  | { status: "blocked"; matched: string; layer: 1 }
  | { status: "review";  matched: string; layer: 1 }
  | { status: "pass";                     layer: 1 };

export function keywordCheck(text: string): KeywordCheckResult {
  const lower = text.toLowerCase();

  for (const lang of ["en", "es", "hi_translit"] as const) {
    for (const word of PROHIBITED_KEYWORDS.hard_block[lang]) {
      const pattern = new RegExp(`\\b${word.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (pattern.test(lower)) return { status: "blocked", matched: word, layer: 1 };
    }
  }

  for (const lang of ["en", "hi_translit"] as const) {
    for (const word of PROHIBITED_KEYWORDS.flag_for_review[lang]) {
      const pattern = new RegExp(`\\b${word.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (pattern.test(lower)) return { status: "review", matched: word, layer: 1 };
    }
  }

  return { status: "pass", layer: 1 };
}
