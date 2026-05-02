import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { GeneratedOutfit } from "@/services/outfitEngine";
import type { ClothingItem } from "@/types";

interface Props {
  outfit: GeneratedOutfit | null;
}

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

  const top = outfit.top as ClothingItem | undefined;
  const bottom = outfit.bottom as ClothingItem | undefined;
  const shoes = outfit.shoes as ClothingItem | undefined;
  const outerwear = outfit.outerwear as ClothingItem | undefined;

  // Lookbook canvas height — slightly taller than wide for a flat-lay feel.
  const canvasHeight = width > 0 ? Math.round(width * 1.18) : 0;

  // Sizes are proportional to the card's width so it scales on any device.
  const topSize = width * 0.5;
  const bottomSize = width * 0.46;
  const shoesSize = width * 0.4;
  const outerSize = width * 0.3;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.card, { backgroundColor: colors.secondary }]}
    >
      {width > 0 ? (
        <View style={{ height: canvasHeight, width: "100%" }}>
          {top ? (
            <LookbookPiece
              uri={top.imageUri}
              size={topSize}
              top={canvasHeight * 0.04}
              left={(width - topSize) / 2}
            />
          ) : null}

          {outerwear ? (
            <LookbookPiece
              uri={outerwear.imageUri}
              size={outerSize}
              top={canvasHeight * 0.06}
              left={width * 0.06}
            />
          ) : null}

          {bottom ? (
            <LookbookPiece
              uri={bottom.imageUri}
              size={bottomSize}
              top={canvasHeight * 0.36}
              left={(width - bottomSize) / 2}
            />
          ) : null}

          {shoes ? (
            <LookbookPiece
              uri={shoes.imageUri}
              size={shoesSize}
              top={canvasHeight * 0.66}
              left={(width - shoesSize) / 2}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function LookbookPiece({
  uri,
  size,
  top,
  left,
}: {
  uri: string;
  size: number;
  top: number;
  left: number;
}) {
  return (
    <View
      style={[
        styles.piece,
        {
          width: size,
          height: size,
          top,
          left,
        },
      ]}
    >
      <Image
        source={{ uri }}
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
    paddingHorizontal: 18,
    paddingVertical: 18,
    overflow: "hidden",
  },
  piece: {
    position: "absolute",
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

