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
import Svg, { Line } from "react-native-svg";

import { EmptyState } from "@/components/EmptyState";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";
import type { Category, ClothingItem, Outfit } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const H_PADDING = 16;
const COL_GAP = 10;
const ITEM_GAP = 5;          // vertical gap between stacked images (px, pre-scale)
const ITEM_WIDTH_FACTOR = 0.75; // each item = 75% of card width
const ITEM_ASPECT = 1.35;    // portrait box — height = width × this factor

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
// Constants for StackedOutfitPreview
// ---------------------------------------------------------------------------

const GRID_SPACING = 18;
const GRID_COLOR = "rgba(180,172,160,0.45)";
const GRID_BG = "#f5f2ed";
const ITEM_W_FACTOR = 0.72;   // every item = 72% of card width
const ITEM_GAP_RAW = 0;       // no gap — items stack flush

// Category-specific aspect ratios (rawH = rawW × ratio)
function categoryAspect(cat: Category): number {
  switch (cat) {
    case "Outerwear": return 1.3;
    case "Top":       return 1.3;
    case "Bottom":    return 1.8;
    case "Shoes":     return 0.6;
    default:          return 1.3; // Accessories etc.
  }
}

// ---------------------------------------------------------------------------
// SVG grid background
// ---------------------------------------------------------------------------

function SvgGrid({ width, height }: { width: number; height: number }) {
  if (width === 0 || height === 0) return null;

  const hLines: number[] = [];
  for (let y = GRID_SPACING; y < height; y += GRID_SPACING) hLines.push(y);

  const vLines: number[] = [];
  for (let x = GRID_SPACING; x < width; x += GRID_SPACING) vLines.push(x);

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      {hLines.map((y) => (
        <Line
          key={`h${y}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke={GRID_COLOR}
          strokeWidth={0.5}
        />
      ))}
      {vLines.map((x) => (
        <Line
          key={`v${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke={GRID_COLOR}
          strokeWidth={0.5}
        />
      ))}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// StackedOutfitPreview
// ---------------------------------------------------------------------------

/**
 * Stacks clothing items top-to-bottom in category order with uniform sizing.
 *
 * Sizing algorithm:
 *   rawW   = cardW × ITEM_W_FACTOR          — same for EVERY item
 *   rawH_i = rawW × categoryAspect(item_i)  — varies by category
 *   rawTotalH = Σ rawH_i + (n-1) × ITEM_GAP_RAW
 *   unifScale = rawTotalH > availH ? availH / rawTotalH : 1
 *                                           — ONE scale, applied to EVERYTHING
 *   finalW    = rawW    × unifScale
 *   finalH_i  = rawH_i × unifScale
 *   gap       = ITEM_GAP_RAW × unifScale
 *
 * No item is ever scaled differently from another.
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

  const positions = useMemo(() => {
    if (cardW === 0 || cardH === 0 || sorted.length === 0) return [];

    const availH = cardH * 0.92;
    const rawW = cardW * ITEM_W_FACTOR;

    // Per-item raw heights using category-specific aspect ratios.
    const rawHeights = sorted.map((item) => rawW * categoryAspect(item.category));
    const rawTotalH =
      rawHeights.reduce((s, h) => s + h, 0) +
      (sorted.length - 1) * ITEM_GAP_RAW;

    // ONE uniform scale — applied identically to every item and every gap.
    const unifScale = rawTotalH > availH ? availH / rawTotalH : 1;

    const finalW = rawW * unifScale;
    const gap    = ITEM_GAP_RAW * unifScale;

    const finalHeights = rawHeights.map((h) => h * unifScale);
    const totalH =
      finalHeights.reduce((s, h) => s + h, 0) + (sorted.length - 1) * gap;

    const startX = (cardW - finalW) / 2;
    let curY = (cardH - totalH) / 2;

    return sorted.map((item, idx) => {
      const pos = {
        item,
        left:  startX,
        top:   curY,
        itemW: finalW,
        itemH: finalHeights[idx],
      };
      curY += finalHeights[idx] + gap;
      return pos;
    });
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
        style={[styles.stackedInner, { backgroundColor: GRID_BG }]}
        onLayout={(e) =>
          setCardDims({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
      >
        {/* SVG grid — pointerEvents="none" so it never blocks taps */}
        <SvgGrid width={cardW} height={cardH} />

        {positions.map(({ item, left, top, itemW, itemH }) => {
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
                width: itemW,
                height: itemH,
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
    height: 200,          // fixed — never grows with content
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
