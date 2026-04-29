import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { ClothingItem } from "@/types";

interface ItemTileProps {
  item: ClothingItem;
  onPress?: () => void;
  onToggleFavorite?: () => void;
  selected?: boolean;
  width: number;
}

export function ItemTile({
  item,
  onPress,
  onToggleFavorite,
  selected,
  width,
}: ItemTileProps) {
  const colors = useColors();
  const isDirty = item.status === "dirty";
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
          opacity: pressed ? 0.85 : isDirty ? 0.65 : 1,
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
        {isDirty ? (
          <View style={[styles.badge, { backgroundColor: colors.foreground }]}>
            <Text style={[styles.badgeText, { color: colors.background }]}>
              Dirty
            </Text>
          </View>
        ) : null}
        {onToggleFavorite ? (
          <Pressable
            onPress={onToggleFavorite}
            hitSlop={8}
            accessibilityLabel={
              item.isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            style={({ pressed }) => [
              styles.favBtn,
              {
                backgroundColor: item.isFavorite
                  ? colors.primary
                  : "rgba(0,0,0,0.45)",
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Feather
              name="heart"
              size={14}
              color={item.isFavorite ? colors.primaryForeground : "#fff"}
            />
          </Pressable>
        ) : null}
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
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  favBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
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
