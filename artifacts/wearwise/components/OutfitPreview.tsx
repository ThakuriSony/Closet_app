import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { GeneratedOutfit } from "@/services/outfitEngine";
import type { Category, ClothingItem } from "@/types";

interface Props {
  outfit: GeneratedOutfit | null;
}

const ORDER: { key: keyof GeneratedOutfit; label: Category }[] = [
  { key: "top", label: "Top" },
  { key: "bottom", label: "Bottom" },
  { key: "shoes", label: "Shoes" },
  { key: "outerwear", label: "Outerwear" },
];

export function OutfitPreview({ outfit }: Props) {
  const colors = useColors();

  if (!outfit) {
    return (
      <View
        style={[
          styles.empty,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="sparkles" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          Ready to dress?
        </Text>
        <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
          Pick an occasion and tap Generate Outfit.
        </Text>
      </View>
    );
  }

  const slots = ORDER.filter(({ key }) => outfit[key as keyof GeneratedOutfit]);

  return (
    <View style={styles.grid}>
      {slots.map(({ key, label }) => {
        const item = outfit[key as keyof GeneratedOutfit] as
          | ClothingItem
          | undefined;
        if (!item) return null;
        return (
          <View
            key={key}
            style={[
              styles.slot,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.imageWrap,
                { backgroundColor: colors.secondary },
              ]}
            >
              <Image
                source={{ uri: item.imageUri }}
                style={styles.image}
                contentFit="cover"
              />
            </View>
            <Text style={[styles.slotLabel, { color: colors.mutedForeground }]}>
              {label}
            </Text>
            <Text
              style={[styles.itemColor, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {item.color}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  slot: {
    width: "47%",
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 10,
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
  },
  image: { width: "100%", height: "100%" },
  slotLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  itemColor: {
    marginTop: 2,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  empty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
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
