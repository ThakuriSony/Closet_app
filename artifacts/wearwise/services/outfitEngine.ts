import type { Category, ClothingItem, EventCategory } from "@/types";
import {
  bucketForTemp,
  type WeatherBucket,
  type WeatherInfo,
} from "@/services/weatherService";

export type Occasion = "Work" | "Casual" | "Gym" | "Party" | "Formal";
export const OCCASIONS: Occasion[] = [
  "Work",
  "Casual",
  "Gym",
  "Party",
  "Formal",
];

// ---------------------------------------------------------------------------
// Outfit templates — the ONLY valid structures the engine may produce
// ---------------------------------------------------------------------------
// DRESS_SHOES        → top(dress) + shoes + optional outerwear
// TOP_BOTTOM_SHOES   → top(non-dress) + bottom + shoes + optional outerwear

type OutfitTemplate = "DRESS_SHOES" | "TOP_BOTTOM_SHOES";

export interface GeneratedOutfit {
  top?: ClothingItem;
  bottom?: ClothingItem;
  shoes?: ClothingItem;
  outerwear?: ClothingItem;
  accessories: ClothingItem[];
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function hasAnyTag(item: ClothingItem, list: string[]): boolean {
  const tags = item.tags.map(normalize);
  return list.some((t) => tags.includes(normalize(t)));
}

function matchCount(item: ClothingItem, list: string[]): number {
  const tags = new Set(item.tags.map(normalize));
  return list.reduce((n, t) => (tags.has(normalize(t)) ? n + 1 : n), 0);
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

// A "Top" item is a dress if it carries the "dress" tag.
function isDress(item: ClothingItem): boolean {
  return item.tags.map(normalize).includes("dress");
}

function scoreItem(
  item: ClothingItem,
  occasion: Occasion,
  weather: WeatherBucket,
  freq: Map<string, number>,
  strict: boolean,
): number {
  let score = 0;
  score += matchCount(item, OCCASION_PREFER[occasion]);
  score += matchCount(item, WEATHER_PREFER[weather]);

  const popularBonus = item.tags.reduce((n, tag) => {
    const f = freq.get(normalize(tag)) ?? 0;
    return n + (f >= 2 ? 1 : 0);
  }, 0);
  score += Math.min(popularBonus, 2);

  if (strict && hasAnyTag(item, OCCASION_AVOID[occasion])) score -= 5;

  score += Math.min(item.createdAt / 1e15, 0.001);
  return score;
}

function pickBest(
  pool: ClothingItem[],
  occasion: Occasion,
  weather: WeatherBucket,
  freq: Map<string, number>,
): ClothingItem | undefined {
  if (pool.length === 0) return undefined;

  const strictRanked = [...pool].sort(
    (a, b) =>
      scoreItem(b, occasion, weather, freq, true) -
      scoreItem(a, occasion, weather, freq, true),
  );

  const top = strictRanked[0]!;
  if (scoreItem(top, occasion, weather, freq, true) < 0) {
    return [...pool].sort(
      (a, b) =>
        scoreItem(b, occasion, weather, freq, false) -
        scoreItem(a, occasion, weather, freq, false),
    )[0];
  }
  return top;
}

function pickBestFor(
  items: ClothingItem[],
  category: Category,
  occasion: Occasion,
  weather: WeatherBucket,
  freq: Map<string, number>,
  // Optional sub-filter within the category (e.g. dress-only / non-dress-only)
  filter?: (i: ClothingItem) => boolean,
): { item: ClothingItem | undefined; usedDirty: boolean } {
  const all = items.filter(
    (i) => i.category === category && (!filter || filter(i)),
  );
  const clean = all.filter((i) => i.status !== "dirty");

  const cleanPick = pickBest(clean, occasion, weather, freq);
  if (cleanPick) return { item: cleanPick, usedDirty: false };

  const dirtyPick = pickBest(all, occasion, weather, freq);
  return { item: dirtyPick, usedDirty: Boolean(dirtyPick) };
}

// ---------------------------------------------------------------------------
// Template selection
// ---------------------------------------------------------------------------
// Occasions that actively prefer dresses when available.
const DRESS_PREFERRED_OCCASIONS: Occasion[] = ["Formal", "Party"];

function selectTemplate(
  items: ClothingItem[],
  occasion: Occasion,
): OutfitTemplate {
  const dresses = items.filter(
    (i) => i.category === "Top" && i.status !== "dirty" && isDress(i),
  );
  const regularTops = items.filter(
    (i) => i.category === "Top" && i.status !== "dirty" && !isDress(i),
  );
  const bottoms = items.filter(
    (i) => i.category === "Bottom" && i.status !== "dirty",
  );

  const hasDress = dresses.length > 0;
  const hasTopBottom = regularTops.length > 0 && bottoms.length > 0;

  // Formal/Party prefer dresses; all other occasions prefer top+bottom.
  if (DRESS_PREFERRED_OCCASIONS.includes(occasion)) {
    if (hasDress) return "DRESS_SHOES";
    if (hasTopBottom) return "TOP_BOTTOM_SHOES";
  } else {
    if (hasTopBottom) return "TOP_BOTTOM_SHOES";
    if (hasDress) return "DRESS_SHOES";
  }

  // Fallback: use whichever template has enough items (including dirty).
  const anyDress = items.some((i) => i.category === "Top" && isDress(i));
  const anyTopBottom =
    items.some((i) => i.category === "Top" && !isDress(i)) &&
    items.some((i) => i.category === "Bottom");

  if (DRESS_PREFERRED_OCCASIONS.includes(occasion)) {
    return anyDress ? "DRESS_SHOES" : "TOP_BOTTOM_SHOES";
  }
  return anyTopBottom ? "TOP_BOTTOM_SHOES" : "DRESS_SHOES";
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isValidOutfit(outfit: GeneratedOutfit): boolean {
  const topIsDress = outfit.top ? isDress(outfit.top) : false;

  // Dress cannot be combined with a Bottom
  if (topIsDress && outfit.bottom) return false;

  // No outfit is valid without shoes (except when shoes are in missing — that
  // means the user simply doesn't own any, which is surfaced separately).
  if (!outfit.shoes && !outfit.missing.includes("Shoes")) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Outerwear rule
// ---------------------------------------------------------------------------

type OuterwearRule = "required" | "optional" | "omit";

function outerwearRule(
  minTemp: number,
  maxTemp: number,
  tempRange: number,
): OuterwearRule {
  if (maxTemp < 10) return "required";
  if (minTemp > 20) return "omit";
  if (tempRange > 10) return "required";
  return "optional";
}

function bucketForOuterwear(minTemp: number, maxTemp: number): WeatherBucket {
  if (maxTemp < 10) return "Cold";
  if (minTemp > 20) return "Hot";
  return bucketForTemp(Math.round((minTemp + maxTemp) / 2));
}

// ---------------------------------------------------------------------------
// Accessory picker
// ---------------------------------------------------------------------------

function pickTopAccessories(
  items: ClothingItem[],
  occasion: Occasion,
  weather: WeatherBucket,
  freq: Map<string, number>,
  limit: number,
): ClothingItem[] {
  const candidates = items.filter((i) => i.category === "Accessories");
  if (candidates.length === 0) return [];

  const cleanFirst = [
    ...candidates.filter((c) => c.status !== "dirty"),
    ...candidates.filter((c) => c.status === "dirty"),
  ];

  return cleanFirst
    .map((item) => ({ item, score: scoreItem(item, occasion, weather, freq, false) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface GenerateOutfitResult extends GeneratedOutfit {
  usedDirty: boolean;
}

export function generateOutfit(
  items: ClothingItem[],
  occasion: Occasion,
  weather: WeatherInfo,
  eventCategory?: EventCategory,
): GenerateOutfitResult {
  const effectiveOccasion: Occasion = eventCategory
    ? occasionForEvent(eventCategory)
    : occasion;

  const freq = buildTagFrequency(items);
  const bodyBucket: WeatherBucket = bucketForTemp(weather.maxTemp);
  const outerBucket: WeatherBucket = bucketForOuterwear(
    weather.minTemp,
    weather.maxTemp,
  );

  // Step 1 — Choose template FIRST so item picking is constrained from the start
  const template = selectTemplate(items, effectiveOccasion);

  // Step 2 — Pick items strictly within template constraints
  const top = pickBestFor(
    items,
    "Top",
    effectiveOccasion,
    bodyBucket,
    freq,
    template === "DRESS_SHOES" ? isDress : (i) => !isDress(i),
  );

  const bottom =
    template === "TOP_BOTTOM_SHOES"
      ? pickBestFor(items, "Bottom", effectiveOccasion, bodyBucket, freq)
      : { item: undefined as ClothingItem | undefined, usedDirty: false };

  const shoes = pickBestFor(items, "Shoes", effectiveOccasion, bodyBucket, freq);

  // Step 3 — Outerwear (weather-gated, template-agnostic)
  const rule = outerwearRule(weather.minTemp, weather.maxTemp, weather.tempRange);
  const outerwear: { item: ClothingItem | undefined; usedDirty: boolean } =
    rule !== "omit"
      ? pickBestFor(items, "Outerwear", effectiveOccasion, outerBucket, freq)
      : { item: undefined, usedDirty: false };

  // Step 4 — Accessories
  const accessories = pickTopAccessories(items, effectiveOccasion, bodyBucket, freq, 3);

  // Step 5 — Build missing list
  const missing: Category[] = [];
  if (!top.item) missing.push("Top");
  if (template === "TOP_BOTTOM_SHOES" && !bottom.item) missing.push("Bottom");
  if (!shoes.item) missing.push("Shoes");
  if (rule === "required" && !outerwear.item) missing.push("Outerwear");

  const candidate: GenerateOutfitResult = {
    top: top.item,
    bottom: bottom.item,
    shoes: shoes.item,
    outerwear: outerwear.item,
    accessories,
    missing,
    usedDirty:
      top.usedDirty ||
      bottom.usedDirty ||
      shoes.usedDirty ||
      outerwear.usedDirty ||
      accessories.some((a) => a.status === "dirty"),
  };

  // Step 6 — Safety check: if somehow invalid (shouldn't happen), retry with
  // the opposite template before returning. We log so it surfaces in dev.
  if (!isValidOutfit(candidate)) {
    console.warn(
      "[outfitEngine] isValidOutfit failed — retrying with opposite template",
      { template, top: top.item?.tags, bottom: bottom.item?.id },
    );

    const fallbackTemplate: OutfitTemplate =
      template === "DRESS_SHOES" ? "TOP_BOTTOM_SHOES" : "DRESS_SHOES";

    const fTop = pickBestFor(
      items,
      "Top",
      effectiveOccasion,
      bodyBucket,
      freq,
      fallbackTemplate === "DRESS_SHOES" ? isDress : (i) => !isDress(i),
    );
    const fBottom =
      fallbackTemplate === "TOP_BOTTOM_SHOES"
        ? pickBestFor(items, "Bottom", effectiveOccasion, bodyBucket, freq)
        : { item: undefined as ClothingItem | undefined, usedDirty: false };

    const fMissing: Category[] = [];
    if (!fTop.item) fMissing.push("Top");
    if (fallbackTemplate === "TOP_BOTTOM_SHOES" && !fBottom.item) fMissing.push("Bottom");
    if (!shoes.item) fMissing.push("Shoes");
    if (rule === "required" && !outerwear.item) fMissing.push("Outerwear");

    return {
      top: fTop.item,
      bottom: fBottom.item,
      shoes: shoes.item,
      outerwear: outerwear.item,
      accessories,
      missing: fMissing,
      usedDirty:
        fTop.usedDirty ||
        fBottom.usedDirty ||
        shoes.usedDirty ||
        outerwear.usedDirty ||
        accessories.some((a) => a.status === "dirty"),
    };
  }

  return candidate;
}

// ---------------------------------------------------------------------------
// generateOutfitOptions — returns up to maxCount structurally valid outfits
// ---------------------------------------------------------------------------
// Differentiation strategy:
//   Phase 1 — rotate through the top-ranked tops (primary differentiator).
//   Phase 2 — if fewer than maxCount, vary shoes while keeping the best top.
// All outfits pass isValidOutfit() before being included.

function rankItems(
  items: ClothingItem[],
  category: Category,
  occasion: Occasion,
  weather: WeatherBucket,
  freq: Map<string, number>,
  filter?: (i: ClothingItem) => boolean,
): ClothingItem[] {
  return items
    .filter((i) => i.category === category && (!filter || filter(i)))
    .sort(
      (a, b) =>
        scoreItem(b, occasion, weather, freq, true) -
        scoreItem(a, occasion, weather, freq, true),
    );
}

function bestAvailable(
  ranked: ClothingItem[],
  exclude: Set<string> = new Set(),
): ClothingItem | undefined {
  return (
    ranked.find((i) => i.status !== "dirty" && !exclude.has(i.id)) ??
    ranked.find((i) => !exclude.has(i.id))
  );
}

export function generateOutfitOptions(
  items: ClothingItem[],
  occasion: Occasion,
  weather: WeatherInfo,
  eventCategory?: EventCategory,
  maxCount = 3,
): GenerateOutfitResult[] {
  const effectiveOccasion: Occasion = eventCategory
    ? occasionForEvent(eventCategory)
    : occasion;

  const freq = buildTagFrequency(items);
  const bodyBucket: WeatherBucket = bucketForTemp(weather.maxTemp);
  const outerBucket: WeatherBucket = bucketForOuterwear(
    weather.minTemp,
    weather.maxTemp,
  );
  const rule = outerwearRule(weather.minTemp, weather.maxTemp, weather.tempRange);
  const template = selectTemplate(items, effectiveOccasion);
  const accessories = pickTopAccessories(items, effectiveOccasion, bodyBucket, freq, 3);

  const topFilter =
    template === "DRESS_SHOES" ? isDress : (i: ClothingItem) => !isDress(i);

  const rankedTops = rankItems(items, "Top", effectiveOccasion, bodyBucket, freq, topFilter);
  const rankedBottoms =
    template === "TOP_BOTTOM_SHOES"
      ? rankItems(items, "Bottom", effectiveOccasion, bodyBucket, freq)
      : [];
  const rankedShoes = rankItems(items, "Shoes", effectiveOccasion, bodyBucket, freq);
  const rankedOuterwear =
    rule !== "omit"
      ? rankItems(items, "Outerwear", effectiveOccasion, outerBucket, freq)
      : [];

  function buildCandidate(
    top: ClothingItem,
    shoesExclude: Set<string> = new Set(),
  ): GenerateOutfitResult | null {
    const bottom =
      template === "TOP_BOTTOM_SHOES" ? bestAvailable(rankedBottoms) : undefined;
    const shoes = bestAvailable(rankedShoes, shoesExclude);
    const outerwear = rule !== "omit" ? bestAvailable(rankedOuterwear) : undefined;

    const missing: Category[] = [];
    if (template === "TOP_BOTTOM_SHOES" && !bottom) missing.push("Bottom");
    if (!shoes) missing.push("Shoes");
    if (rule === "required" && !outerwear) missing.push("Outerwear");

    const c: GenerateOutfitResult = {
      top,
      bottom,
      shoes,
      outerwear,
      accessories,
      missing,
      usedDirty:
        top.status === "dirty" ||
        bottom?.status === "dirty" ||
        shoes?.status === "dirty" ||
        outerwear?.status === "dirty" ||
        accessories.some((a) => a.status === "dirty"),
    };
    return isValidOutfit(c) ? c : null;
  }

  const results: GenerateOutfitResult[] = [];

  // Phase 1 — rotate tops
  for (const top of rankedTops) {
    if (results.length >= maxCount) break;
    const c = buildCandidate(top);
    if (c) results.push(c);
  }

  // Phase 2 — vary shoes with the best top when more options are needed
  if (results.length < maxCount && rankedTops.length > 0) {
    const bestTop = rankedTops[0]!;
    const usedShoes = new Set(
      results.map((r) => r.shoes?.id).filter(Boolean) as string[],
    );
    for (const shoesItem of rankedShoes) {
      if (results.length >= maxCount) break;
      if (usedShoes.has(shoesItem.id)) continue;

      const bottom =
        template === "TOP_BOTTOM_SHOES" ? bestAvailable(rankedBottoms) : undefined;
      const outerwear = rule !== "omit" ? bestAvailable(rankedOuterwear) : undefined;

      const missing: Category[] = [];
      if (template === "TOP_BOTTOM_SHOES" && !bottom) missing.push("Bottom");
      if (rule === "required" && !outerwear) missing.push("Outerwear");

      const c: GenerateOutfitResult = {
        top: bestTop,
        bottom,
        shoes: shoesItem,
        outerwear,
        accessories,
        missing,
        usedDirty:
          bestTop.status === "dirty" ||
          bottom?.status === "dirty" ||
          shoesItem.status === "dirty" ||
          outerwear?.status === "dirty" ||
          accessories.some((a) => a.status === "dirty"),
      };
      if (isValidOutfit(c)) {
        results.push(c);
        usedShoes.add(shoesItem.id);
      }
    }
  }

  // Final fallback — at minimum return the single-outfit result
  if (results.length === 0) {
    results.push(generateOutfit(items, occasion, weather, eventCategory));
  }

  return results;
}
