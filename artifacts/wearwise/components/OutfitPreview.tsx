import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { GeneratedOutfit } from "@/services/outfitEngine";
import type { ClothingItem } from "@/types";

interface Props {
  outfit: GeneratedOutfit | null;
}

type SlotKind = "top" | "bottom" | "shoes" | "outerwear" | "accessory";

interface LayoutBlock {
  key: string;
  kind: SlotKind;
  uri: string;
  x: number; // px from canvas left
  y: number; // px from canvas top
  w: number;
  h: number;
  z: number;
}

// Prefer the background-removed PNG when available so items sit cleanly on
// the container background instead of pulling along their own rectangle.
function displayUri(item: ClothingItem): string {
  return item.processedImageUri && item.processedImageUri.length > 0
    ? item.processedImageUri
    : item.imageUri;
}

// ---------------------------------------------------------------------------
// Composition engine
// ---------------------------------------------------------------------------
//
// Builds a Pinterest / editorial flat-lay arrangement from the outfit pieces.
// Coordinates are relative to a virtual canvas sized to the container width.
// The result is intentionally asymmetric: the BOTTOM piece is the anchor on
// the lower-left, the TOP sits above it slightly offset, OUTERWEAR floats in
// the top-right, SHOES sit mid-right, and the optional ACCESSORY clusters
// below the shoes. Missing slots trigger small rebalances rather than holes.
//
// Each tile renders the source image with `contentFit="contain"`, so wider
// pieces (shoes, scarves) don't stretch — they just sit inside their box.

interface SlotRect {
  // Fractions of the canvas width / height. Converted to pixels at render
  // time so the layout scales to any container size.
  xf: number;
  yf: number;
  wf: number;
  hf: number;
  z: number;
}

// Default 5-piece flat-lay (all slots populated). The numbers are tuned to
// honor the design rules: bottom is largest (anchor), top is secondary,
// outerwear floats top-right, shoes sit mid-right, accessory clusters below.
const FULL_LAYOUT: Record<SlotKind, SlotRect> = {
  top:       { xf: 0.02, yf: 0.04, wf: 0.46, hf: 0.42, z: 2 },
  bottom:    { xf: 0.06, yf: 0.40, wf: 0.54, hf: 0.56, z: 3 },
  outerwear: { xf: 0.58, yf: 0.02, wf: 0.34, hf: 0.40, z: 1 },
  shoes:     { xf: 0.62, yf: 0.46, wf: 0.34, hf: 0.22, z: 4 },
  accessory: { xf: 0.66, yf: 0.72, wf: 0.26, hf: 0.22, z: 5 },
};

// Lookup of fallback layouts when slots are missing. Keys are sorted slot
// names joined with "+", values are partial layouts that override FULL_LAYOUT.
function rebalance(present: Set<SlotKind>): Record<SlotKind, SlotRect> {
  const layout: Record<SlotKind, SlotRect> = {
    ...FULL_LAYOUT,
  };

  // No outerwear → let the top breathe into the upper-right.
  if (!present.has("outerwear")) {
    layout.top = { xf: 0.04, yf: 0.04, wf: 0.54, hf: 0.46, z: 2 };
  }

  // No accessory → give the shoes more vertical room and shift them lower
  // so the right column doesn't feel top-heavy.
  if (!present.has("accessory")) {
    layout.shoes = { xf: 0.60, yf: 0.56, wf: 0.36, hf: 0.26, z: 4 };
  }

  // No shoes → drop accessory into shoes' spot so the right column has
  // something at eye level.
  if (!present.has("shoes") && present.has("accessory")) {
    layout.accessory = { xf: 0.62, yf: 0.50, wf: 0.30, hf: 0.26, z: 5 };
  }

  // Only TWO pieces total → center them with a deliberate horizontal offset
  // so it still reads asymmetric.
  if (present.size === 2 && present.has("top") && present.has("bottom")) {
    layout.top    = { xf: 0.10, yf: 0.06, wf: 0.50, hf: 0.46, z: 2 };
    layout.bottom = { xf: 0.30, yf: 0.42, wf: 0.58, hf: 0.56, z: 3 };
  }

  // Only ONE piece → center it at hero size.
  if (present.size === 1) {
    const only = [...present][0]!;
    layout[only] = { xf: 0.18, yf: 0.10, wf: 0.64, hf: 0.80, z: 1 };
  }

  return layout;
}

function compose(
  width: number,
  height: number,
  outfit: GeneratedOutfit,
): LayoutBlock[] {
  const slots: { kind: SlotKind; item?: ClothingItem }[] = [
    { kind: "top", item: outfit.top },
    { kind: "bottom", item: outfit.bottom },
    { kind: "outerwear", item: outfit.outerwear },
    { kind: "shoes", item: outfit.shoes },
    { kind: "accessory", item: outfit.accessory },
  ];

  const present = new Set<SlotKind>(
    slots.filter((s) => s.item).map((s) => s.kind),
  );
  if (present.size === 0) return [];

  const layout = rebalance(present);

  return slots
    .filter((s): s is { kind: SlotKind; item: ClothingItem } => !!s.item)
    .map((s) => {
      const r = layout[s.kind];
      return {
        key: `${s.kind}:${s.item.id}`,
        kind: s.kind,
        uri: displayUri(s.item),
        x: Math.round(r.xf * width),
        y: Math.round(r.yf * height),
        w: Math.round(r.wf * width),
        h: Math.round(r.hf * height),
        z: r.z,
      };
    });
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

  // The canvas is slightly taller than wide so the asymmetric layout has
  // room to breathe (≈25% negative space).
  const canvasHeight = width > 0 ? Math.round(width * 1.15) : 0;

  const blocks =
    width > 0 && canvasHeight > 0 ? compose(width, canvasHeight, outfit) : [];

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.card,
        { backgroundColor: colors.secondary },
      ]}
    >
      {width > 0 ? (
        <View
          style={{
            height: canvasHeight,
            width: "100%",
          }}
        >
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
    // Soft, low-contrast shadow — keeps any non-transparent edges from
    // feeling harsh against the card background.
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
