import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const ALLOWED_CATEGORIES = [
  "Top",
  "Bottom",
  "Shoes",
  "Outerwear",
  "Accessories",
] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

interface TagResult {
  category: Category;
  color: string;
  tags: string[];
}

const SYSTEM_PROMPT = `You are an expert fashion stylist that tags clothing items.
Analyze the clothing item image and return ONLY valid JSON in this exact format:
{
  "category": one of [Top, Bottom, Shoes, Outerwear, Accessories],
  "color": main color of the item as a short string (e.g. "Charcoal", "Cream", "Navy"),
  "tags": array of 2-5 short descriptive tags (e.g. casual, formal, sporty, denim, cotton, linen, summer)
}
Do not include any explanation, markdown, or extra text. Output JSON only.`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip code fences if present
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate ?? "");
  } catch {
    // Try to find first JSON object substring
    const match = candidate?.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function validateTagResult(raw: unknown): TagResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const category = typeof r["category"] === "string" ? r["category"] : "";
  const matchedCategory = ALLOWED_CATEGORIES.find(
    (c) => c.toLowerCase() === category.toLowerCase(),
  );
  if (!matchedCategory) return null;

  const color = typeof r["color"] === "string" ? r["color"].trim() : "";
  if (!color) return null;

  let tags: string[] = [];
  if (Array.isArray(r["tags"])) {
    tags = r["tags"]
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);
  }

  return {
    category: matchedCategory,
    color,
    tags,
  };
}

async function callModel(imageDataUrl: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this clothing item and return only the JSON.",
          },
          {
            type: "image_url",
            image_url: { url: imageDataUrl },
          },
        ],
      },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

interface ExplainItem {
  slot: string;
  category: string;
  color: string;
  tags: string[];
}

router.post("/ai/explain-outfit", async (req, res) => {
  const body = req.body as {
    occasion?: unknown;
    weather?: { tempC?: unknown; condition?: unknown; bucket?: unknown };
    items?: unknown;
  };

  const occasion = typeof body.occasion === "string" ? body.occasion : "";
  const tempC =
    typeof body.weather?.tempC === "number" ? body.weather.tempC : null;
  const condition =
    typeof body.weather?.condition === "string" ? body.weather.condition : "";
  const items = Array.isArray(body.items) ? (body.items as ExplainItem[]) : [];

  if (!occasion || tempC === null || items.length === 0) {
    res.status(400).json({ error: "occasion, weather and items required" });
    return;
  }

  const itemSummary = items
    .map(
      (i) =>
        `${i.slot}: ${i.color} ${i.category}${
          i.tags?.length ? ` (${i.tags.join(", ")})` : ""
        }`,
    )
    .join("\n");

  const prompt = `Outfit:
${itemSummary}

Occasion: ${occasion}
Weather: ${tempC}°C, ${condition}

Explain in 1-2 short sentences why this outfit works for the occasion and weather. Be friendly and concrete. No greetings, no labels, just the explanation.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });
    const explanation =
      completion.choices[0]?.message?.content?.trim() ?? "";
    res.json({ explanation });
  } catch (err) {
    req.log.error({ err }, "Outfit explanation failed");
    res.status(502).json({ error: "AI service unavailable" });
  }
});

router.post("/ai/tag-clothing", async (req, res) => {
  const body = req.body as { imageBase64?: unknown; mimeType?: unknown };
  const imageBase64 =
    typeof body.imageBase64 === "string" ? body.imageBase64 : null;
  const mimeType =
    typeof body.mimeType === "string" && body.mimeType
      ? body.mimeType
      : "image/jpeg";

  if (!imageBase64) {
    res.status(400).json({ error: "imageBase64 is required" });
    return;
  }

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  try {
    let raw = await callModel(dataUrl);
    let parsed = validateTagResult(extractJson(raw));

    if (!parsed) {
      req.log.warn("AI returned invalid JSON, retrying once");
      raw = await callModel(dataUrl);
      parsed = validateTagResult(extractJson(raw));
    }

    if (!parsed) {
      res
        .status(422)
        .json({ error: "AI returned invalid response after retry" });
      return;
    }

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "AI tagging failed");
    res.status(502).json({ error: "AI service unavailable" });
  }
});

export default router;
