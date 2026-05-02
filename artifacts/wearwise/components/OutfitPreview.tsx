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
// Helpers
// ---------------------------------------------------------------------------

function displayUri(item: ClothingItem): string {
  return item.processedImageUri && item.processedImageUri.length > 0
    ? item.processedImageUri
    : item.imageUri;
}

// ---------------------------------------------------------------------------
// Decorative grid-line background
// ---------------------------------------------------------------------------
// Renders evenly-spaced horizontal + vertical hairlines over the warm
// off-white (#FAF7F0) base. Lines are purely cosmetic absolute Views; they
// sit beneath the card grid via zIndex ordering.

const LINE_COLOR = "#EAEAEA";
const LINE_SPACING = 28; // px between grid lines
const LINE_WIDTH = StyleSheet.hairlineWidth;

function GridBackground({ width, height }: { width: number; height: number }) {
  if (width === 0 || height === 0) return null;

  const hLines: number[] = [];
  for (let y = LINE_SPACING; y < height; y += LINE_SPACING) hLines.push(y);

  const vLines: number[] = [];
  for (let x = LINE_SPACING; x < width; x += LINE_SPACING) vLines.push(x);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {hLines.map((y) => (
        <View
          key={`h${y}`}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: y,
            height: LINE_WIDTH,
            backgroundColor: LINE_COLOR,
          }}
        />
      ))}
      {vLines.map((x) => (
        <View
          key={`v${x}`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: x,
            width: LINE_WIDTH,
            backgroundColor: LINE_COLOR,
          }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Single clothing card
// ---------------------------------------------------------------------------

function ItemCard({ item }: { item: ClothingItem | null | undefined }) {
  if (!item) {
    // Invisible placeholder — holds its slot so the grid never shifts
    return <View style={styles.cardEmpty} />;
  }
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: displayUri(item) }}
        style={styles.cardImage}
        contentFit="contain"
        transition={150}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Grid layout
// ---------------------------------------------------------------------------
//
//   Case 1 — Standard (top + bottom + shoes, no outerwear):
//     top-left  = Top        top-right  = Shoes
//     bot-left  = Bottom     bot-right  = [empty]
//
//   Case 2 — With outerwear:
//     top-left  = Top        top-right  = Outerwear
//     bot-left  = Bottom     bot-right  = Shoes
//
//   Case 3 — Dress (top but no bottom):
//     top-left  = Top/Dress  top-right  = Shoes
//     bot-left  = [empty]    bot-right  = [empty]

export function OutfitPreview({ outfit }: Props) {
  const colors = useColors();
  const [dims, setDims] = useState({ width: 0, height: 0 });

  if (!outfit) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.secondary }]}>
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

  const hasOuterwear = !!outfit.outerwear;

  const topLeft    = outfit.top ?? null;
  const bottomLeft = outfit.bottom ?? null;
  const topRight   = hasOuterwear ? (outfit.outerwear ?? null) : (outfit.shoes ?? null);
  const bottomRight = hasOuterwear ? (outfit.shoes ?? null) : null;

  return (
    <View
      style={styles.container}
      onLayout={(e) =>
        setDims({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      {/* Decorative grid lines drawn on the warm off-white base */}
      <GridBackground width={dims.width} height={dims.height} />

      {/* 2 × 2 card grid — sits above the background lines */}
      <View style={styles.grid}>
        <View style={styles.column}>
          <ItemCard item={topLeft} />
          <ItemCard item={bottomLeft} />
        </View>
        <View style={styles.column}>
          <ItemCard item={topRight} />
          <ItemCard item={bottomRight} />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CARD_RADIUS = 18;
const CELL_GAP = 10;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FAF7F0",
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
  },

  grid: {
    flexDirection: "row",
    gap: CELL_GAP,
    zIndex: 1,
  },

  column: {
    flex: 1,
    gap: CELL_GAP,
  },

  card: {
    backgroundColor: "#F1F1F1",
    borderRadius: CARD_RADIUS,
    aspectRatio: 1,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  cardEmpty: {
    backgroundColor: "transparent",
    borderRadius: CARD_RADIUS,
    aspectRatio: 1,
  },

  cardImage: {
    width: "100%",
    height: "100%",
  },

  // Empty state (no outfit generated yet)
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
