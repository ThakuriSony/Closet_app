import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { ClothingItem } from "@/types";

interface ItemTileProps {
  item: ClothingItem;
  onPress?: () => void;
  selected?: boolean;
  width: number;
}

export function ItemTile({ item, onPress, selected, width }: ItemTileProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          width,
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.secondary }]}>
        <Image
          source={{ uri: item.imageUri }}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
      </View>
      <View style={styles.meta}>
        <Text
          numberOfLines={1}
          style={[styles.category, { color: colors.foreground }]}
        >
          {item.category}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.color, { color: colors.mutedForeground }]}
        >
          {item.color}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: "hidden",
  },
  imageWrap: {
    aspectRatio: 1,
    width: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  meta: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  category: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  color: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
