import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { GeneratedOutfit } from "@/services/outfitEngine";
import type { ClothingItem } from "@/types";

interface Props {
  outfit: GeneratedOutfit | null;
}

function displayUri(item: ClothingItem): string {
  return item.processedImageUri && item.processedImageUri.length > 0
    ? item.processedImageUri
    : item.imageUri;
}

// ---------------------------------------------------------------------------
// Single clothing slot
// ---------------------------------------------------------------------------

function ItemCard({ item }: { item: ClothingItem | null | undefined }) {
  if (!item) {
    // Transparent placeholder — holds its grid slot without any visual chrome
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

  const topLeft    = outfit.top     ?? null;
  const bottomLeft = outfit.bottom  ?? null;
  const topRight   = hasOuterwear ? (outfit.outerwear ?? null) : (outfit.shoes ?? null);
  const bottomRight = hasOuterwear ? (outfit.shoes ?? null) : null;

  return (
    <View style={styles.container}>
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

const CELL_GAP = 10;

const styles = StyleSheet.create({
  // Outer wrapper — transparent, keeps padding so items don't run edge-to-edge
  container: {
    paddingVertical: 8,
  },

  grid: {
    flexDirection: "row",
    gap: CELL_GAP,
  },

  column: {
    flex: 1,
    gap: CELL_GAP,
  },

  // No background, no border — just a sized slot for the image
  card: {
    aspectRatio: 1,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  // Invisible placeholder — identical dimensions to a card
  cardEmpty: {
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
