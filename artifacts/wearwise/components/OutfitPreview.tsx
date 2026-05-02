import { Image } from "expo-image";
import React from "react";
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
// Single clothing card
// ---------------------------------------------------------------------------

function ItemCard({ item, label }: { item: ClothingItem | null | undefined; label?: string }) {
  if (!item) {
    // Empty placeholder — preserves grid structure without shifting siblings
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
      {label ? (
        <Text style={styles.cardLabel} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Grid layout
// ---------------------------------------------------------------------------
//
// The 2 × 2 grid follows three deterministic cases:
//
//   Case 1 — Normal (top + bottom + shoes, no outerwear):
//     top-left  = Top      top-right  = Shoes
//     bot-left  = Bottom   bot-right  = [empty]
//
//   Case 2 — With outerwear:
//     top-left  = Top      top-right  = Outerwear
//     bot-left  = Bottom   bot-right  = Shoes
//
//   Case 3 — Dress (top but no bottom):
//     top-left  = Top      top-right  = Shoes
//     bot-left  = [empty]  bot-right  = [empty]
//
// Slots that are null render as empty squares — they hold space without
// collapsing the column so the layout never shifts.

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function OutfitPreview({ outfit }: Props) {
  const colors = useColors();

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

  // Resolve the four grid slots
  const topLeft   = outfit.top;
  const bottomLeft = outfit.bottom ?? null;
  const topRight  = hasOuterwear ? outfit.outerwear : (outfit.shoes ?? null);
  const bottomRight = hasOuterwear ? (outfit.shoes ?? null) : null;

  return (
    <View style={styles.container}>
      {/* Subtle grid-line effect: EAEAEA background shows through the 2 px gap */}
      <View style={styles.grid}>
        {/* Left column */}
        <View style={styles.column}>
          <ItemCard item={topLeft} />
          <ItemCard item={bottomLeft} />
        </View>

        {/* Right column */}
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

const CARD_BORDER_RADIUS = 16;
const GRID_GAP = 2;   // gap between cells — EAEAEA background peeks through

const styles = StyleSheet.create({
  // Outer container: white background, rounded, padded
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },

  // Inner wrapper carries the EAEAEA grid-line colour and renders the gaps
  grid: {
    backgroundColor: "#EAEAEA",
    borderRadius: CARD_BORDER_RADIUS + 2,
    flexDirection: "row",
    gap: GRID_GAP,
    overflow: "hidden",
  },

  column: {
    flex: 1,
    gap: GRID_GAP,
  },

  // Occupied card
  card: {
    backgroundColor: "#F1F1F1",
    borderRadius: CARD_BORDER_RADIUS,
    aspectRatio: 1,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  // Empty placeholder — same dimensions as a card, invisible
  cardEmpty: {
    backgroundColor: "#F1F1F1",
    borderRadius: CARD_BORDER_RADIUS,
    aspectRatio: 1,
    opacity: 0,
  },

  cardImage: {
    width: "100%",
    height: "100%",
  },

  cardLabel: {
    position: "absolute",
    bottom: 6,
    left: 6,
    right: 6,
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: "#6B6B6B",
    textAlign: "center",
  },

  // Empty-state card (no outfit generated yet)
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
