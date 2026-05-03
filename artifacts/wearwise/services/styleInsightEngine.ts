/**
 * Rule-based style insight engine.
 * Deterministic — no AI, no network calls.
 * Inputs: skin tone, undertone, height, weight, face shape.
 * Outputs: friendly suggestion bullets in three categories.
 */

import type { StyleProfileData } from "@/contexts/StyleProfileContext";

export interface StyleInsights {
  color:      string[];
  silhouette: string[];
  length:     string[];
  hasData:    boolean;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function getStyleInsights(p: StyleProfileData): StyleInsights {
  const heightCm = toHeightCm(p.height_value, p.height_unit);
  const hRange   = heightRange(heightCm);
  const hasData  =
    !!(p.skin_tone || p.undertone || p.face_shape || p.height_value);

  return {
    color:      colorGuidance(p.skin_tone, p.undertone),
    silhouette: silhouetteGuidance(p.face_shape, hRange),
    length:     lengthGuidance(hRange, p.height_value),
    hasData,
  };
}

// ---------------------------------------------------------------------------
// Color guidance
// ---------------------------------------------------------------------------

function colorGuidance(skinTone: string | null, undertone: string | null): string[] {
  const bullets: string[] = [];

  // Undertone-based palette
  if (undertone === "Warm") {
    bullets.push(
      "Warm undertones often look great in cream, olive, rust, terracotta, and warm caramel browns.",
    );
  } else if (undertone === "Cool") {
    bullets.push(
      "Cool undertones tend to shine in navy, lavender, emerald, icy pastels, and deep jewel tones.",
    );
  } else if (undertone === "Neutral") {
    bullets.push(
      "Neutral undertones work with a wide range — from rose and mauve to soft earth tones and dusty pastels.",
    );
  }

  // Skin-tone modifier
  switch (skinTone) {
    case "Ivory":
      bullets.push(
        "Soft, muted hues and blush tones tend to be especially lovely — very stark white can sometimes wash out.",
      );
      break;
    case "Sand":
      bullets.push(
        "Earthy tones like camel and forest green harmonise naturally; navy and burgundy also tend to pop.",
      );
      break;
    case "Honey":
      bullets.push(
        "Golden oranges, coral, and warm olive tones can look especially vibrant against your complexion.",
      );
      break;
    case "Caramel":
      bullets.push(
        "Rich cobalt, bright white, and deep jewel tones can look stunning and bold.",
      );
      break;
    case "Bronze":
      bullets.push(
        "Mustard, chartreuse, and vivid jewel tones can create striking contrast — bright whites also work beautifully.",
      );
      break;
    case "Espresso":
      bullets.push(
        "Bright whites, vivid pastels, and rich jewel tones all tend to complement and create beautiful contrast.",
      );
      break;
  }

  // Generic fallback if no data
  if (bullets.length === 0) {
    bullets.push(
      "Add your skin tone and undertone to your Style Profile for personalised colour suggestions.",
    );
  }

  return bullets;
}

// ---------------------------------------------------------------------------
// Silhouette guidance
// ---------------------------------------------------------------------------

type HeightRange = "short" | "average" | "tall";

function silhouetteGuidance(faceShape: string | null, hRange: HeightRange): string[] {
  const bullets: string[] = [];

  // Face/body shape guidance
  switch (faceShape) {
    case "Oval":
      bullets.push(
        "Most necklines and silhouettes work beautifully — V-necks and wrap styles are especially versatile.",
      );
      break;
    case "Round":
      bullets.push(
        "Vertical lines, V-necks, and longer open cardigans tend to create an elegant elongating effect.",
      );
      break;
    case "Square":
      bullets.push(
        "Soft curved necklines, A-line skirts, and wrap dresses can beautifully soften angular lines.",
      );
      break;
    case "Diamond":
      bullets.push(
        "Off-shoulder tops, boat necks, and fuller skirts tend to balance shoulder and hip width naturally.",
      );
      break;
    case "Heart":
      bullets.push(
        "A-line silhouettes and wrap skirts often work beautifully, adding visual balance below the waist.",
      );
      break;
    case "Rectangle":
      bullets.push(
        "Peplum tops, wrap styles, and belted pieces tend to add lovely definition and shape.",
      );
      break;
  }

  // Height-based silhouette tip
  switch (hRange) {
    case "short":
      bullets.push(
        "Monochromatic or tonal dressing and high-waisted pieces tend to create a graceful lengthening effect.",
      );
      break;
    case "tall":
      bullets.push(
        "You have great freedom with proportions — wide-leg trousers, oversized layers, and bold shapes often look effortless.",
      );
      break;
    case "average":
      bullets.push(
        "Most silhouettes work well — you have real versatility across fitted and relaxed shapes.",
      );
      break;
  }

  if (bullets.length === 0) {
    bullets.push(
      "Complete your Style Profile to unlock personalised silhouette suggestions.",
    );
  }

  return bullets;
}

// ---------------------------------------------------------------------------
// Length guidance
// ---------------------------------------------------------------------------

function lengthGuidance(hRange: HeightRange, heightValue: number | null): string[] {
  if (heightValue === null) {
    return [
      "Add your height to your Style Profile for personalised length suggestions.",
    ];
  }

  switch (hRange) {
    case "short":
      return [
        "Above-knee and midi lengths often complement your proportions naturally.",
        "High-waisted bottoms and cropped jackets can help create a lovely lengthening line.",
      ];
    case "tall":
      return [
        "Maxi and full-length styles can look effortless and elegant at your height.",
        "Midi, above-knee, and wide-leg cuts all work beautifully — you have plenty of range.",
      ];
    case "average":
    default:
      return [
        "Most lengths work wonderfully — midi tends to be an especially flattering choice.",
        "Above-knee, maxi, and cropped all offer different effects to play with.",
      ];
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function toHeightCm(value: number | null, unit: "cm" | "ft"): number {
  if (value === null) return 170;
  if (unit === "cm") return value;
  // ft index encoding from setup screen
  const ft   = 4 + Math.floor(value / 12);
  const inch = value % 12;
  return ft * 30.48 + inch * 2.54;
}

function heightRange(cm: number): HeightRange {
  if (cm < 162) return "short";
  if (cm > 175) return "tall";
  return "average";
}
