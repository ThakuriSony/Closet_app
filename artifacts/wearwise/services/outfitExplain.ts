import type { GeneratedOutfit, Occasion } from "@/services/outfitEngine";
import type { WeatherInfo } from "@/services/weatherService";

function apiBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  return `https://${domain}`;
}

interface ExplainPayload {
  occasion: Occasion;
  weather: { tempC: number; condition: string; bucket: string };
  items: { slot: string; category: string; color: string; tags: string[] }[];
}

export async function explainOutfit(
  outfit: GeneratedOutfit,
  occasion: Occasion,
  weather: WeatherInfo,
): Promise<string> {
  const items: ExplainPayload["items"] = [];
  if (outfit.top)
    items.push({
      slot: "Top",
      category: outfit.top.category,
      color: outfit.top.color,
      tags: outfit.top.tags,
    });
  if (outfit.bottom)
    items.push({
      slot: "Bottom",
      category: outfit.bottom.category,
      color: outfit.bottom.color,
      tags: outfit.bottom.tags,
    });
  if (outfit.shoes)
    items.push({
      slot: "Shoes",
      category: outfit.shoes.category,
      color: outfit.shoes.color,
      tags: outfit.shoes.tags,
    });
  if (outfit.outerwear)
    items.push({
      slot: "Outerwear",
      category: outfit.outerwear.category,
      color: outfit.outerwear.color,
      tags: outfit.outerwear.tags,
    });

  const payload: ExplainPayload = {
    occasion,
    weather: {
      tempC: weather.tempC,
      condition: weather.condition,
      bucket: weather.bucket,
    },
    items,
  };

  const res = await fetch(`${apiBaseUrl()}/api/ai/explain-outfit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Explain request failed (${res.status})`);
  const data = (await res.json()) as { explanation?: string };
  return (data.explanation ?? "").trim();
}
