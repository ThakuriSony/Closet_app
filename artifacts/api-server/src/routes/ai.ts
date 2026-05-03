import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const ALLOWED_CATEGORIES = [
  "Top",
  "Bottom",
  "Dress",
  "Outerwear",
  "Shoes",
  "Accessories",
] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

const ALLOWED_STYLE_TAGS = new Set([
  "casual", "formal", "work", "party", "gym", "streetwear", "lounge", "athleisure",
]);
const ALLOWED_DRESS_TAGS = new Set(["mini", "midi", "maxi"]);
const ALLOWED_SHOE_TAGS  = new Set(["heels", "sneakers", "boots", "flats", "sandals"]);

interface TagResult {
  category: Category;
  color: string;
  tags: string[];
}

const SYSTEM_PROMPT = `Analyze this clothing item image and return ONLY valid JSON.
Choose ONE category from:
Top, Bottom, Dress, Outerwear, Shoes, Accessories.

Category guidance:
- Top = shirts, t-shirts, blouses, sweaters, hoodies (worn on torso, not as a coat)
- Bottom = pants, jeans, shorts, skirts, leggings (worn below the waist)
- Dress = one-piece garments covering torso and legs together
- Outerwear = jackets, coats, blazers, parkas (worn over a top)
- Shoes = any footwear
- Accessories = bags, hats, belts, scarves, jewelry, glasses

Also return the main color of the item as a short string (e.g. "Charcoal", "Cream", "Navy").

Then assign up to 5 highly confident tags from the following lists ONLY:

Style / occasion tags:
casual, formal, work, party, gym, streetwear, lounge, athleisure

Dress length tags (ONLY if category is Dress):
mini, midi, maxi

Footwear type tags (ONLY if category is Shoes):
heels, sneakers, boots, flats, sandals

Return ONLY valid JSON in this format:
{
  "category": "Top | Bottom | Dress | Outerwear | Shoes | Accessories",
  "color": "main color",
  "tags": ["tag1", "tag2"]
}

If a tag is unclear, omit it.
Do not guess.
Do not include explanations or extra text.`;

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
      .filter((t) => {
        if (ALLOWED_STYLE_TAGS.has(t)) return true;
        if (matchedCategory === "Dress" && ALLOWED_DRESS_TAGS.has(t)) return true;
        if (matchedCategory === "Shoes" && ALLOWED_SHOE_TAGS.has(t)) return true;
        return false;
      })
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
            text: "Analyze the full clothing item in this image. If part of it is not fully visible, infer the most likely category carefully. Return only the JSON.",
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
