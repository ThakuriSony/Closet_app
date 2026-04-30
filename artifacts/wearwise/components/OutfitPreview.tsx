import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { GeneratedOutfit } from "@/services/outfitEngine";
import type { ClothingItem } from "@/types";

interface Props {
  outfit: GeneratedOutfit | null;
}

// The image source we render: prefer the background-removed PNG when available
// so the lookbook layout sits cleanly on the card background.
function displayUri(item: ClothingItem): string {
  return item.processedImageUri && item.processedImageUri.length > 0
    ? item.processedImageUri
    : item.imageUri;
}

export function OutfitPreview({ outfit }: Props) {
  const colors = useColors();

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

  const top = outfit.top as ClothingItem | undefined;
  const bottom = outfit.bottom as ClothingItem | undefined;
  const shoes = outfit.shoes as ClothingItem | undefined;
  const outerwear = outfit.outerwear as ClothingItem | undefined;
  const accessory = outfit.accessory as ClothingItem | undefined;

  // Right column hosts shoes + accessories. If there's no accessory, fall back
  // to outerwear so the right column doesn't feel empty.
  const rightSecondary = accessory ?? outerwear;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.secondary, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.column}>
          {top ? (
            <Piece uri={displayUri(top)} size="large" />
          ) : (
            <Placeholder size="large" label="Top" />
          )}
          {bottom ? (
            <Piece uri={displayUri(bottom)} size="medium" />
          ) : (
            <Placeholder size="medium" label="Bottom" />
          )}
        </View>

        <View style={styles.column}>
          {shoes ? (
            <Piece uri={displayUri(shoes)} size="medium" />
          ) : (
            <Placeholder size="medium" label="Shoes" />
          )}
          {rightSecondary ? (
            <Piece uri={displayUri(rightSecondary)} size="small" />
          ) : (
            <Placeholder size="small" label="Accessory" />
          )}
        </View>
      </View>
    </View>
  );
}

type Size = "large" | "medium" | "small";

const HEIGHTS: Record<Size, number> = {
  large: 170,
  medium: 130,
  small: 90,
};

function Piece({ uri, size }: { uri: string; size: Size }) {
  return (
    <View style={[styles.piece, { height: HEIGHTS[size] }]}>
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
        transition={150}
      />
    </View>
  );
}

function Placeholder({ size, label }: { size: Size; label: string }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.placeholder,
        {
          height: HEIGHTS[size],
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[styles.placeholderText, { color: colors.mutedForeground }]}
      >
        No {label.toLowerCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  column: {
    flex: 1,
    gap: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  piece: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    // Subtle, minimal shadow — keeps items readable on the card without
    // looking heavy.
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  placeholder: {
    width: "100%",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
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
