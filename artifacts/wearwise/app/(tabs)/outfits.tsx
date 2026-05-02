import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";
import type { Category, ClothingItem, Outfit } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const H_PADDING = 16;
const COL_GAP = 10;
const ITEM_GAP = 4; // vertical gap between stacked images

// Category stacking order: top garment → bottom → shoes → accessories
const STACK_ORDER: Partial<Record<Category, number>> = {
  Outerwear: 0,
  Top: 1,
  Bottom: 2,
  Shoes: 3,
  Accessories: 4,
};

type OutfitFilter = "All" | "Favorites";

// ---------------------------------------------------------------------------
// StackedOutfitPreview
// ---------------------------------------------------------------------------

/**
 * Renders clothing items stacked top-to-bottom ordered by category.
 *
 * Layout math:
 *   itemW  = cardW × 0.60   (60% of card width per image, square)
 *   rawH   = n × itemW + (n-1) × ITEM_GAP
 *   scale  = if rawH > availH → availH / rawH  else 1
 *   Entire stack is centered horizontally and vertically inside the card.
 */
function StackedOutfitPreview({
  items,
  onPress,
}: {
  items: ClothingItem[];
  onPress?: () => void;
}) {
  const [cardDims, setCardDims] = useState({ w: 0, h: 0 });

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          (STACK_ORDER[a.category] ?? 9) - (STACK_ORDER[b.category] ?? 9),
      ),
    [items],
  );

  const { w: cardW, h: cardH } = cardDims;

  // Compute positions once card has been measured.
  const positions = useMemo(() => {
    if (cardW === 0 || cardH === 0 || sorted.length === 0) return [];

    const availH = cardH * 0.92;
    const rawItemW = cardW * 0.60;
    const n = sorted.length;
    const rawTotalH = n * rawItemW + (n - 1) * ITEM_GAP;

    const scale = rawTotalH > availH ? availH / rawTotalH : 1;
    const itemW = rawItemW * scale;
    const gap = ITEM_GAP * scale;
    const totalH = n * itemW + (n - 1) * gap;

    const startX = (cardW - itemW) / 2;
    const startY = (cardH - totalH) / 2;

    return sorted.map((item, idx) => ({
      item,
      left: startX,
      top: startY + idx * (itemW + gap),
      size: itemW,
    }));
  }, [sorted, cardW, cardH]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.stackedOuter,
        { opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View
        style={styles.stackedInner}
        onLayout={(e) =>
          setCardDims({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
      >
        {positions.map(({ item, left, top, size }) => {
          const uri =
            item.processedImageUri && item.processedImageUri.length > 0
              ? item.processedImageUri
              : item.imageUri;
          return (
            <Image
              key={item.id}
              source={{ uri }}
              style={{
                position: "absolute",
                left,
                top,
                width: size,
                height: size,
              }}
              contentFit="contain"
            />
          );
        })}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function OutfitsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { outfits, items, removeOutfit, toggleOutfitFavorite } = useWardrobe();
  const [filter, setFilter] = useState<OutfitFilter>("All");

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const tabBarOffset = Platform.OS === "web" ? 100 : 110;

  const canCreate = items.length > 0;

  const filteredOutfits = useMemo(() => {
    if (filter === "All") return outfits;
    return outfits.filter((o) => o.isFavorite);
  }, [outfits, filter]);

  const onCreateStudio = () => {
    if (!canCreate) {
      Alert.alert(
        "No items yet",
        "Add some clothing items to your closet first.",
      );
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/studio");
  };

  const onDelete = (outfit: Outfit) => {
    Alert.alert("Delete outfit?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeOutfit(outfit.id),
      },
    ]);
  };

  const onToggleFav = (outfit: Outfit) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    void toggleOutfitFavorite(outfit.id);
  };

  const onEditLookbook = (outfit: Outfit) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/studio?id=${outfit.id}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + webTopInset + 12 },
        ]}
      >
        <View>
          <Text style={[styles.kicker, { color: colors.mutedForeground }]}>
            Wearwise
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Outfits
          </Text>
        </View>

        <Pressable
          onPress={onCreateStudio}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="plus" size={22} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {/* Filter chips */}
      {outfits.length > 0 && (
        <View style={styles.filterRow}>
          <OutfitFilterChips value={filter} onChange={setFilter} />
        </View>
      )}

      {/* List / empty states */}
      {outfits.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="layers"
            title="No outfits yet"
            description="Tap + to open Studio and design your first look."
          />
        </View>
      ) : filteredOutfits.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="heart"
            title="No favorites yet"
            description="Tap the heart on any outfit to save it here."
          />
        </View>
      ) : (
        <FlatList
          data={filteredOutfits}
          keyExtractor={(o) => o.id}
          numColumns={2}
          columnWrapperStyle={{ gap: COL_GAP }}
          contentContainerStyle={{
            paddingHorizontal: H_PADDING,
            paddingTop: 4,
            paddingBottom: insets.bottom + tabBarOffset,
            gap: COL_GAP,
          }}
          renderItem={({ item: outfit }) => {
            const isLookbook = outfit.type === "lookbook";

            const outfitItems = outfit.itemIds
              .map((id) => items.find((i) => i.id === id))
              .filter((v): v is NonNullable<typeof v> => Boolean(v));

            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Stacked thumbnail */}
                <StackedOutfitPreview
                  items={outfitItems}
                  onPress={isLookbook ? () => onEditLookbook(outfit) : undefined}
                />

                {/* Footer */}
                <View style={styles.cardFooter}>
                  {/* Studio badge */}
                  {isLookbook && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: colors.foreground },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeLabel,
                          { color: colors.background },
                        ]}
                      >
                        Studio
                      </Text>
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.actions}>
                    {isLookbook && (
                      <Pressable
                        onPress={() => onEditLookbook(outfit)}
                        hitSlop={10}
                        accessibilityLabel="Edit in Studio"
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.5 : 1,
                        })}
                      >
                        <Feather
                          name="edit-2"
                          size={16}
                          color={colors.mutedForeground}
                        />
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => onToggleFav(outfit)}
                      hitSlop={10}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.5 : 1,
                      })}
                    >
                      <Feather
                        name="heart"
                        size={16}
                        color={
                          outfit.isFavorite
                            ? colors.primary
                            : colors.mutedForeground
                        }
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => onDelete(outfit)}
                      hitSlop={10}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.5 : 1,
                      })}
                    >
                      <Feather
                        name="trash-2"
                        size={16}
                        color={colors.mutedForeground}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

function OutfitFilterChips({
  value,
  onChange,
}: {
  value: OutfitFilter;
  onChange: (f: OutfitFilter) => void;
}) {
  const colors = useColors();
  const all: OutfitFilter[] = ["All", "Favorites"];
  return (
    <View style={styles.chipRow}>
      {all.map((c) => {
        const active = value === c;
        const isFav = c === "Favorites";
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: active ? colors.foreground : colors.card,
                borderColor: active ? colors.foreground : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {isFav && (
              <Feather
                name="heart"
                size={12}
                color={active ? colors.background : colors.mutedForeground}
              />
            )}
            <Text
              style={[
                styles.chipLabel,
                {
                  color: active
                    ? colors.background
                    : colors.mutedForeground,
                },
              ]}
            >
              {c}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  kicker: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  filterRow: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 14,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  emptyWrap: { flex: 1 },

  // 2-column card
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    overflow: "hidden",
  },

  // Stacked preview container (portrait)
  stackedOuter: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
  },
  stackedInner: {
    width: "100%",
    aspectRatio: 0.72,   // portrait — roughly 160 × 222
    backgroundColor: "#F5F4F0",
    borderRadius: 10,
    overflow: "hidden",
  },

  // Card footer
  cardFooter: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    flexShrink: 0,
  },
  badgeLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: "auto",
  },
});
