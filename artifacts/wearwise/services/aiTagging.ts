import { CATEGORIES, type Category } from "@/types";

export interface AiTagSuggestion {
  category: Category;
  color: string;
  tags: string[];
}

function apiBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }
  return `https://${domain}`;
}

function isValidSuggestion(raw: unknown): raw is AiTagSuggestion {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  if (!CATEGORIES.includes(r["category"] as Category)) return false;
  if (typeof r["color"] !== "string" || !r["color"]) return false;
  if (!Array.isArray(r["tags"])) return false;
  return r["tags"].every((t) => typeof t === "string");
}

export async function analyzeClothingImage(
  imageBase64: string,
  mimeType: string = "image/jpeg",
): Promise<AiTagSuggestion> {
  if (!imageBase64) throw new Error("Empty image");

  const res = await fetch(`${apiBaseUrl()}/api/ai/tag-clothing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${text}`);
  }

  const data: unknown = await res.json();
  if (!isValidSuggestion(data)) {
    throw new Error("AI response failed validation");
  }
  return data;
}
