/**
 * CanvasRenderer — shared rendering logic for Studio lookbook previews.
 *
 * Used in PREVIEW mode (outfits.tsx LookbookPreview).
 * Studio itself renders via CanvasItem.tsx (handles gestures separately).
 *
 * Algorithm (Part B bounding-box fit):
 *   1. Reconstruct absolute positions: x = nx * canvasW, y = ny * canvasH
 *   2. Compute per-item size: itemSize = s * canvasW * baseSizeFactor
 *      (= s * CANVAS_ITEM_SIZE — same constant used in Studio)
 *   3. Compute bounding box of all items in studio coordinate space.
 *   4. Compute a single fitScale so the outfit (not the full canvas) fits
 *      inside the square preview with a small margin.
 *   5. Compute offsets to center the outfit inside the square.
 *   6. Render with: left = x * fitScale + offsetX
 *                   top  = y * fitScale + offsetY
 *                   size = itemSize * fitScale
 *
 * This preserves relative spacing exactly as designed in Studio.
 */

import { Image } from "expo-image";
import React from "react";

import type { LookbookItem, LookbookMeta } from "@/types";

const FIT_MARGIN = 0.88; // outfit fills 88% of the square — leaves breathing room

export interface RendererItem extends LookbookItem {
  imageUri: string;
}

interface Props {
  items: RendererItem[];
  meta: LookbookMeta;
  previewSize: number; // square side length in px (from onLayout)
}

export function CanvasRenderer({ items, meta, previewSize }: Props) {
  if (previewSize === 0 || items.length === 0) return null;

  const { canvasW, canvasH, baseSizeFactor } = meta;

  // ── 1. Reconstruct absolute canvas positions ──────────────────────────────
  const abs = items.map((item) => ({
    ...item,
    x: item.nx * canvasW,
    y: item.ny * canvasH,
    // Item base size in Studio px units (matches CANVAS_ITEM_SIZE * scale)
    sz: canvasW * baseSizeFactor * item.s,
  }));

  // ── 2. Bounding box in Studio coordinate space ───────────────────────────
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const a of abs) {
    if (a.x < minX) minX = a.x;
    if (a.y < minY) minY = a.y;
    if (a.x + a.sz > maxX) maxX = a.x + a.sz;
    if (a.y + a.sz > maxY) maxY = a.y + a.sz;
  }

  const boundsW = Math.max(maxX - minX, 1);
  const boundsH = Math.max(maxY - minY, 1);

  // ── 3. Single global fitScale — outfit fills the square, not the canvas ──
  const fitScale =
    Math.min(previewSize / boundsW, previewSize / boundsH) * FIT_MARGIN;

  // ── 4. Center offsets ────────────────────────────────────────────────────
  const outfitCenterX = minX + boundsW / 2;
  const outfitCenterY = minY + boundsH / 2;
  const offsetX = previewSize / 2 - outfitCenterX * fitScale;
  const offsetY = previewSize / 2 - outfitCenterY * fitScale;

  // Debug (temporary — remove before ship)
  if (__DEV__) {
    console.log(
      "[CanvasRenderer] layout:",
      JSON.stringify(
        abs.map((a) => ({ x: +a.x.toFixed(1), y: +a.y.toFixed(1), s: a.s, z: a.z })),
      ),
    );
    console.log(
      `[CanvasRenderer] boundsW=${boundsW.toFixed(1)} boundsH=${boundsH.toFixed(1)} fitScale=${fitScale.toFixed(3)}`,
    );
    if (abs[0]) {
      const a = abs[0];
      console.log(
        `[CanvasRenderer] item[0] → left=${(a.x * fitScale + offsetX).toFixed(1)} top=${(a.y * fitScale + offsetY).toFixed(1)} size=${(a.sz * fitScale).toFixed(1)}`,
      );
    }
  }

  // ── 5. Render sorted by z (ascending — highest z paints last / on top) ───
  const sorted = [...abs].sort((a, b) => a.z - b.z);

  return (
    <>
      {sorted.map((item, idx) => {
        const left = item.x * fitScale + offsetX;
        const top = item.y * fitScale + offsetY;
        const size = item.sz * fitScale;

        return (
          <Image
            key={`${item.itemId}-${idx}`}
            source={{ uri: item.imageUri }}
            style={{
              position: "absolute",
              left,
              top,
              width: size,
              height: size,
              zIndex: item.z,
            }}
            contentFit="contain"
          />
        );
      })}
    </>
  );
}
