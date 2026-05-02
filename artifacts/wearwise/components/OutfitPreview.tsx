import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { GeneratedOutfit } from "@/services/outfitEngine";
import type { ClothingItem } from "@/types";

interface Props {
  outfit: GeneratedOutfit | null;
}

// ---------------------------------------------------------------------------
// Composition system (Pinterest / editorial flat-lay)
// ---------------------------------------------------------------------------
//
// The layout is built around a few hard rules:
//
//   1. NORMALIZED BOUNDING BOXES PER CATEGORY
//      Every item lives inside a fixed-aspect box decided by its category:
//        - Top         → 1 : 1   (square)
//        - Bottom      → 3 : 4   (vertical)   ← anchor
//        - Outerwear   → 1 : 1   (square)
//        - Shoes       → 4 : 3   (horizontal)
//        - Accessory   → 1 : 1   (small square, clustered)
//      Combined with `contentFit="contain"` and the server-side `crop=true`
//      we send to remove.bg, every item ends up visually weighted the same
//      way regardless of how the source photo was framed.
//
//   2. ANCHOR + RELATIVE POSITIONING
//      The BOTTOM piece is the anchor. Every other slot's position is
//      derived from the bottom's box. If bottom is missing, the top becomes
//      the anchor and we recenter from there.
//
//   3. TWO ALIGNMENT SPINES (asymmetric, not mirrored)
//      Left column items share an x-center spine (~0.27 of canvas width).
//      Right column items share a different spine (~0.78). The spines
//      themselves are offset, so the layout reads asymmetric overall while
//      each column still feels deliberate.
//
//   4. ACCESSORY CLUSTER
//      Up to 3 accessories render as a tight grouped unit on the right
//      column, never scattered.
//
//   5. NEGATIVE SPACE
//      Canvas height = width × 1.18. Items collectively occupy ~70% of
//      canvas area; the remaining ~30% is intentional whitespace.

type SlotKind = "top" | "bottom" | "shoes" | "outerwear" | "accessory";

interface LayoutBlock {
  key: string;
  kind: SlotKind;
  uri: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}

// Aspect ratio (width / height) of each category's bounding box.
const ASPECT: Record<SlotKind, number> = {
  top: 1, // 1:1
  bottom: 3 / 4, // 3:4 vertical
  outerwear: 1, // 1:1
  shoes: 4 / 3, // 4:3 horizontal
  accessory: 1, // small square
};

function displayUri(item: ClothingItem): string {
  const uri =
    item.processedImageUri && item.processedImageUri.length > 0
      ? item.processedImageUri
      : item.imageUri;
  console.log(
    `[OutfitPreview] ${item.category} (${item.id.slice(-6)}) using:`,
    item.processedImageUri ? "processedImageUri ✓" : "original imageUri",
    uri.slice(0, 60),
  );
  return uri;
}

// Returns the layout blocks for the given canvas size and outfit.
function compose(
  canvasW: number,
  canvasH: number,
  outfit: GeneratedOutfit,
): LayoutBlock[] {
  const blocks: LayoutBlock[] = [];

  // Spines define the x-center of each column. Slight asymmetry between them
  // (left at 0.30, right at 0.74) keeps the composition off-center.
  const spineLeft = canvasW * 0.3;
  const spineRight = canvasW * 0.74;

  // Anchor: BOTTOM (3:4). Width is the dominant slot in the layout.
  const bottomW = canvasW * 0.5;
  const bottomH = bottomW / ASPECT.bottom; // 3:4 → height = w * 4/3
  const bottomX = spineLeft - bottomW / 2;
  // Position the bottom so it sits in the lower portion of the canvas with
  // a small margin from the bottom edge.
  const bottomY = canvasH - bottomH - canvasH * 0.04;
  if (outfit.bottom) {
    blocks.push({
      key: `bottom:${outfit.bottom.id}`,
      kind: "bottom",
      uri: displayUri(outfit.bottom),
      x: bottomX,
      y: bottomY,
      w: bottomW,
      h: bottomH,
      z: 3,
    });
  }

  // TOP (1:1) sits above the bottom on the same spine, with a small
  // breathing gap. If there's no bottom, recenter near the top of the canvas.
  const topW = canvasW * 0.42;
  const topH = topW / ASPECT.top;
  const topX = spineLeft - topW / 2;
  const topY = outfit.bottom
    ? Math.max(canvasH * 0.03, bottomY - topH - canvasH * 0.025)
    : canvasH * 0.08;
  if (outfit.top) {
    blocks.push({
      key: `top:${outfit.top.id}`,
      kind: "top",
      uri: displayUri(outfit.top),
      x: topX,
      y: topY,
      w: topW,
      h: topH,
      z: 2,
    });
  }

  // OUTERWEAR (1:1) — small, near the top of the right column, deliberately
  // offset toward the right edge so it reads as "pinned" rather than
  // mirroring the top.
  const outerW = canvasW * 0.3;
  const outerH = outerW / ASPECT.outerwear;
  const outerX = canvasW - outerW - canvasW * 0.03;
  const outerY = canvasH * 0.03;
  if (outfit.outerwear) {
    blocks.push({
      key: `outerwear:${outfit.outerwear.id}`,
      kind: "outerwear",
      uri: displayUri(outfit.outerwear),
      x: outerX,
      y: outerY,
      w: outerW,
      h: outerH,
      z: 1,
    });
  }

  // SHOES (4:3) — middle of the right column, on the right spine. If there's
  // no outerwear, shoes lift higher to fill the visual gap at the top.
  const shoesW = canvasW * 0.36;
  const shoesH = shoesW / ASPECT.shoes;
  const shoesX = spineRight - shoesW / 2;
  const shoesY = outfit.outerwear
    ? outerY + outerH + canvasH * 0.03
    : canvasH * 0.18;
  if (outfit.shoes) {
    blocks.push({
      key: `shoes:${outfit.shoes.id}`,
      kind: "shoes",
      uri: displayUri(outfit.shoes),
      x: shoesX,
      y: shoesY,
      w: shoesW,
      h: shoesH,
      z: 4,
    });
  }

  // ACCESSORY CLUSTER — up to 3 items, grouped on the right spine below the
  // shoes. Layout depends on count:
  //   1 → single tile, centered
  //   2 → side-by-side
  //   3 → triangle (two on top, one centered below)
  const accessories = (outfit.accessories ?? []).slice(0, 3);
  if (accessories.length > 0) {
    const tile = canvasW * 0.18; // each accessory tile is ~18% wide
    const gap = canvasW * 0.02;
    const clusterTop = outfit.shoes
      ? shoesY + shoesH + canvasH * 0.03
      : canvasH * 0.45;

    type Pos = { dx: number; dy: number };
    const positionsByCount: Record<number, Pos[]> = {
      1: [{ dx: 0, dy: 0 }],
      2: [
        { dx: -(tile / 2 + gap / 2), dy: 0 },
        { dx: tile / 2 + gap / 2, dy: 0 },
      ],
      3: [
        { dx: -(tile / 2 + gap / 2), dy: 0 },
        { dx: tile / 2 + gap / 2, dy: 0 },
        { dx: 0, dy: tile + gap },
      ],
    };
    const positions = positionsByCount[accessories.length] ?? [];
    accessories.forEach((acc, i) => {
      const p = positions[i];
      if (!p) return;
      blocks.push({
        key: `accessory:${acc.id}`,
        kind: "accessory",
        uri: displayUri(acc),
        x: spineRight + p.dx - tile / 2,
        y: clusterTop + p.dy,
        w: tile,
        h: tile / ASPECT.accessory,
        z: 5,
      });
    });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function OutfitPreview({ outfit }: Props) {
  const colors = useColors();
  const [width, setWidth] = useState(0);

  if (!outfit) {
    return (
      <View
        style={[styles.empty, { backgroundColor: colors.secondary }]}
      >
        <View style={styles.emptyDot} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          Ready to dress?
        </Text>
        <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
          Pick an occasion and tap Generate Outfit.
        </Text>
      </View>
    );
  }

  // Canvas height ~1.18× width gives the bottom anchor room to breathe and
  // leaves ~25–30% negative space overall.
  const canvasHeight = width > 0 ? Math.round(width * 1.18) : 0;

  const blocks =
    width > 0 && canvasHeight > 0 ? compose(width, canvasHeight, outfit) : [];

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.card, { backgroundColor: colors.secondary }]}
    >
      {width > 0 ? (
        <View style={{ height: canvasHeight, width: "100%", position: "relative" }}>
          {blocks.map((b) => (
            <Tile key={b.key} block={b} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Tile({ block }: { block: LayoutBlock }) {
  return (
    <View
      style={[
        styles.tile,
        {
          left: block.x,
          top: block.y,
          width: block.w,
          height: block.h,
          zIndex: block.z,
        },
      ]}
    >
      <Image
        source={{ uri: block.uri }}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
        transition={150}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 22,
    overflow: "hidden",
  },
  tile: {
    position: "absolute",
    // Subtle shadow under each item — barely visible on a transparent PNG,
    // softens any non-removed edges on the fallback originals.
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  empty: {
    borderRadius: 20,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#111111",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
