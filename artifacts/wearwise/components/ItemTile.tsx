import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import type { ClothingItem } from "@/types";

interface ItemTileProps {
  item: ClothingItem;
  onPress?: () => void;
  onToggleFavorite?: () => void;
  selected?: boolean;
  /** Optional fixed width. When omitted the tile fills its parent. */
  width?: number;
  /** Optional aspect ratio (width / height). Defaults to 1. */
  aspectRatio?: number;
}

export function ItemTile({
  item,
  onPress,
  onToggleFavorite,
  selected,
  width,
  aspectRatio = 1,
}: ItemTileProps) {
  const colors = useColors();
  const isDirty = item.status === "dirty";

  const processedImageUri = item.processedImageUri ?? null;
  const displayUri = processedImageUri ?? item.imageUri;
  const hasProcessed = !!processedImageUri;

  if (hasProcessed) {
    console.log("Using processed image:", processedImageUri);
  }

  // Shimmer pulse while background removal is pending.
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (hasProcessed) {
      shimmer.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hasProcessed, shimmer]);

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          width,
          backgroundColor: colors.card,
          borderColor: selected ? colors.foreground : "transparent",
          borderWidth: selected ? 2 : 0,
          opacity: pressed ? 0.85 : isDirty ? 0.65 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.imageWrap,
          {
            backgroundColor: hasProcessed ? "#F1F1F1" : colors.secondary,
            aspectRatio,
          },
        ]}
      >
        <Image
          source={{ uri: displayUri }}
          style={styles.image}
          contentFit={hasProcessed ? "contain" : "cover"}
          transition={150}
        />

        {/* Shimmer overlay — visible while background removal is in progress */}
        {!hasProcessed ? (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.shimmerOverlay,
              { opacity: shimmerOpacity },
            ]}
          />
        ) : null}

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
                  ? colors.foreground
                  : "rgba(255,255,255,0.85)",
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Feather
              name="heart"
              size={14}
              color={item.isFavorite ? colors.background : colors.foreground}
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
    borderRadius: 15,
    overflow: "hidden",
  },
  imageWrap: {
    width: "100%",
    position: "relative",
    borderRadius: 15,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  shimmerOverlay: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
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
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
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
