import type { Category, ClothingItem, EventCategory } from "@/types";
import type { WeatherBucket } from "@/services/weatherService";

export type Occasion = "Work" | "Casual" | "Gym" | "Party" | "Formal";
export const OCCASIONS: Occasion[] = [
  "Work",
  "Casual",
  "Gym",
  "Party",
  "Formal",
];

export interface GeneratedOutfit {
  top?: ClothingItem;
  bottom?: ClothingItem;
  shoes?: ClothingItem;
  outerwear?: ClothingItem;
  missing: Category[];
}

const OCCASION_PREFER: Record<Occasion, string[]> = {
  Work: ["formal", "neutral", "business", "smart", "office", "clean"],
  Casual: ["casual", "everyday", "denim", "cotton", "relaxed"],
  Gym: ["sporty", "active", "athletic", "gym", "running", "workout"],
  Party: ["stylish", "dark", "bold", "party", "evening", "trendy"],
  Formal: ["formal", "elegant", "tailored", "suit", "dress", "smart"],
};

const OCCASION_AVOID: Record<Occasion, string[]> = {
  Work: ["sporty", "gym", "athletic", "workout"],
  Casual: [],
  Gym: ["formal", "business"],
  Party: ["sporty", "gym", "athletic"],
  Formal: ["sporty", "gym", "athletic", "casual"],
};

const WEATHER_PREFER: Record<WeatherBucket, string[]> = {
  Cold: ["wool", "thick", "warm", "fleece", "knit", "hoodie", "jacket", "long"],
  Mild: ["cotton", "denim", "long-sleeve"],
  Hot: ["cotton", "linen", "breathable", "shorts", "light", "tank"],
};

// Map event categories onto occasion buckets used by the engine.
const EVENT_TO_OCCASION: Record<EventCategory, Occasion> = {
  Work: "Work",
  Casual: "Casual",
  Party: "Party",
  Formal: "Formal",
  Sporty: "Gym",
};

export function occasionForEvent(category: EventCategory): Occasion {
  return EVENT_TO_OCCASION[category];
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function hasAnyTag(item: ClothingItem, list: string[]): boolean {
  const tags = item.tags.map(normalize);
  return list.some((t) => tags.includes(normalize(t)));
}

function matchCount(item: ClothingItem, list: string[]): number {
  const tags = new Set(item.tags.map(normalize));
  return list.reduce(
    (n, t) => (tags.has(normalize(t)) ? n + 1 : n),
    0,
  );
}

function buildTagFrequency(items: ClothingItem[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const it of items) {
    for (const tag of it.tags) {
      const key = normalize(tag);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  return freq;
}

function scoreItem(
  item: ClothingItem,
  occasion: Occasion,
  weather: WeatherBucket,
  freq: Map<string, number>,
  strict: boolean,
): number {
  let score = 0;

  const occasionMatches = matchCount(item, OCCASION_PREFER[occasion]);
  score += occasionMatches;

  const weatherMatches = matchCount(item, WEATHER_PREFER[weather]);
  score += weatherMatches;

  const popularBonus = item.tags.reduce((n, tag) => {
    const f = freq.get(normalize(tag)) ?? 0;
    return n + (f >= 2 ? 1 : 0);
  }, 0);
  score += Math.min(popularBonus, 2);

  if (strict && hasAnyTag(item, OCCASION_AVOID[occasion])) {
    score -= 5;
  }

  score += Math.min(item.createdAt / 1e15, 0.001);

  return score;
}

function pickBest(
  items: ClothingItem[],
  category: Category,
  occasion: Occasion,
  weather: WeatherBucket,
  freq: Map<string, number>,
): ClothingItem | undefined {
  const pool = items.filter((i) => i.category === category);
  if (pool.length === 0) return undefined;

  const strictRanked = [...pool].sort(
    (a, b) =>
      scoreItem(b, occasion, weather, freq, true) -
      scoreItem(a, occasion, weather, freq, true),
  );

  const top = strictRanked[0];
  const topScore = top
    ? scoreItem(top, occasion, weather, freq, true)
    : -Infinity;

  if (topScore < 0) {
    const relaxed = [...pool].sort(
      (a, b) =>
        scoreItem(b, occasion, weather, freq, false) -
        scoreItem(a, occasion, weather, freq, false),
    );
    return relaxed[0];
  }
  return top;
}

function pickBestFor(
  items: ClothingItem[],
  category: Category,
  occasion: Occasion,
  weather: WeatherBucket,
  freq: Map<string, number>,
): { item: ClothingItem | undefined; usedDirty: boolean } {
  const clean = items.filter((i) => i.status !== "dirty");
  const cleanPick = pickBest(clean, category, occasion, weather, freq);
  if (cleanPick) return { item: cleanPick, usedDirty: false };

  // Fallback: relax the dirty filter if no clean candidate exists.
  const dirtyPick = pickBest(items, category, occasion, weather, freq);
  return { item: dirtyPick, usedDirty: Boolean(dirtyPick) };
}

export interface GenerateOutfitResult extends GeneratedOutfit {
  usedDirty: boolean;
}

export function generateOutfit(
  items: ClothingItem[],
  occasion: Occasion,
  weather: WeatherBucket,
  eventCategory?: EventCategory,
): GenerateOutfitResult {
  const effectiveOccasion: Occasion = eventCategory
    ? occasionForEvent(eventCategory)
    : occasion;

  const freq = buildTagFrequency(items);

  const top = pickBestFor(items, "Top", effectiveOccasion, weather, freq);
  const bottom = pickBestFor(items, "Bottom", effectiveOccasion, weather, freq);
  const shoes = pickBestFor(items, "Shoes", effectiveOccasion, weather, freq);

  let outerwear: { item: ClothingItem | undefined; usedDirty: boolean } = {
    item: undefined,
    usedDirty: false,
  };
  if (weather !== "Hot") {
    outerwear = pickBestFor(
      items,
      "Outerwear",
      effectiveOccasion,
      weather,
      freq,
    );
  }

  const missing: Category[] = [];
  if (!top.item) missing.push("Top");
  if (!bottom.item) missing.push("Bottom");
  if (!shoes.item) missing.push("Shoes");
  if (weather === "Cold" && !outerwear.item) missing.push("Outerwear");

  const usedDirty =
    top.usedDirty ||
    bottom.usedDirty ||
    shoes.usedDirty ||
    outerwear.usedDirty;

  return {
    top: top.item,
    bottom: bottom.item,
    shoes: shoes.item,
    outerwear: outerwear.item,
    missing,
    usedDirty,
  };
}
