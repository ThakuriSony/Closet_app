import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";
import type { ClothingItem, LookbookItem, Outfit } from "@/types";

const H_PADDING = 20;
const ITEM_BASE = 140; // matches CANVAS_ITEM_SIZE in CanvasItem.tsx

type OutfitFilter = "All" | "Favorites";

// ---------------------------------------------------------------------------
// Mini canvas snapshot for lookbook outfits
// ---------------------------------------------------------------------------

const PREVIEW_PADDING = 14; // px buffer on each side inside the square

/**
 * Normalises raw canvas coordinates so the outfit is centered and
 * fully visible inside a preview square of `size` px.
 *
 * Returns { left, top, renderedSize } for each layout entry.
 */
function normalizeLayout(
  layout: LookbookItem[],
  size: number,
): Array<{ itemId: string; left: number; top: number; renderedSize: number }> {
  if (size === 0 || layout.length === 0) return [];

  // 1. Bounding box of the composed outfit in original canvas coordinates.
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const e of layout) {
    const s = ITEM_BASE * e.scale;
    if (e.x < minX) minX = e.x;
    if (e.y < minY) minY = e.y;
    if (e.x + s > maxX) maxX = e.x + s;
    if (e.y + s > maxY) maxY = e.y + s;
  }

  const contentW = Math.max(maxX - minX, 1);
  const contentH = Math.max(maxY - minY, 1);

  // 2. Scale so the largest dimension fills the available area.
  const available = size - PREVIEW_PADDING * 2;
  const scaleFactor = available / Math.max(contentW, contentH);

  // 3. Center the scaled content inside the square.
  const scaledW = contentW * scaleFactor;
  const scaledH = contentH * scaleFactor;
  const offsetX = (size - scaledW) / 2;
  const offsetY = (size - scaledH) / 2;

  return layout.map((e) => ({
    itemId: e.itemId,
    left: (e.x - minX) * scaleFactor + offsetX,
    top: (e.y - minY) * scaleFactor + offsetY,
    renderedSize: ITEM_BASE * e.scale * scaleFactor,
  }));
}

function LookbookPreview({
  layout,
  allItems,
  onPress,
}: {
  layout: LookbookItem[];
  allItems: ClothingItem[];
  onPress?: () => void;
}) {
  const [containerSize, setContainerSize] = useState(0);

  const normalized = useMemo(
    () => normalizeLayout(layout, containerSize),
    [layout, containerSize],
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.lookbookContainer,
        { opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View
        style={styles.lookbookCanvas}
        onLayout={(e) => setContainerSize(e.nativeEvent.layout.width)}
      >
        <CanvasGridLines size={containerSize} />

        {containerSize > 0 &&
          normalized.map((n, idx) => {
            const item = allItems.find((i) => i.id === n.itemId);
            if (!item) return null;
            const uri =
              item.processedImageUri && item.processedImageUri.length > 0
                ? item.processedImageUri
                : item.imageUri;
            return (
              <Image
                key={`${n.itemId}-${idx}`}
                source={{ uri }}
                style={{
                  position: "absolute",
                  left: n.left,
                  top: n.top,
                  width: n.renderedSize,
                  height: n.renderedSize,
                }}
                contentFit="contain"
              />
            );
          })}
      </View>
    </Pressable>
  );
}

function CanvasGridLines({ size }: { size: number }) {
  const SPACING = 22;
  const LINE_W = StyleSheet.hairlineWidth;
  const COLOR = "rgba(0,0,0,0.07)";

  const lines: React.ReactNode[] = [];
  for (let y = SPACING; y < size; y += SPACING) {
    lines.push(
      <View
        key={`h${y}`}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y,
          height: LINE_W,
          backgroundColor: COLOR,
        }}
      />,
    );
  }
  for (let x = SPACING; x < size; x += SPACING) {
    lines.push(
      <View
        key={`v${x}`}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: x,
          width: LINE_W,
          backgroundColor: COLOR,
        }}
      />,
    );
  }
  return <>{lines}</>;
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
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
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
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="plus" size={22} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {outfits.length > 0 ? (
        <View style={styles.filterRow}>
          <OutfitFilterChips value={filter} onChange={setFilter} />
        </View>
      ) : null}

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
          contentContainerStyle={{
            paddingHorizontal: H_PADDING,
            paddingTop: 4,
            paddingBottom: insets.bottom + tabBarOffset,
            gap: 14,
          }}
          renderItem={({ item }) => {
            const isLookbook = item.type === "lookbook";
            const hasLayout =
              isLookbook && Array.isArray(item.layout) && item.layout.length > 0;

            // Items for generated outfit preview row
            const outfitItems = item.itemIds
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
                {/* Preview area */}
                {hasLayout ? (
                  <LookbookPreview
                    layout={item.layout!}
                    allItems={items}
                    onPress={() => onEditLookbook(item)}
                  />
                ) : (
                  <View style={styles.previewRow}>
                    {outfitItems.slice(0, 4).map((it) => (
                      <View
                        key={it.id}
                        style={[
                          styles.preview,
                          { backgroundColor: colors.secondary },
                        ]}
                      >
                        <Image
                          source={{ uri: it.imageUri }}
                          style={styles.previewImg}
                          contentFit="cover"
                        />
                      </View>
                    ))}
                  </View>
                )}

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.cardLeft}>
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
                    <Text
                      style={[
                        styles.cardTitle,
                        { color: colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {outfitItems.map((i) => i.category).join(" · ")}
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    {isLookbook && (
                      <Pressable
                        onPress={() => onEditLookbook(item)}
                        hitSlop={10}
                        accessibilityLabel="Edit in Studio"
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.5 : 1,
                        })}
                      >
                        <Feather
                          name="edit-2"
                          size={18}
                          color={colors.mutedForeground}
                        />
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => onToggleFav(item)}
                      hitSlop={10}
                      accessibilityLabel={
                        item.isFavorite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.5 : 1,
                      })}
                    >
                      <Feather
                        name="heart"
                        size={18}
                        color={
                          item.isFavorite
                            ? colors.primary
                            : colors.mutedForeground
                        }
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => onDelete(item)}
                      hitSlop={10}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.5 : 1,
                      })}
                    >
                      <Feather
                        name="trash-2"
                        size={18}
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
            {isFav ? (
              <Feather
                name="heart"
                size={12}
                color={active ? colors.background : colors.mutedForeground}
              />
            ) : null}
            <Text
              style={[
                styles.chipLabel,
                {
                  color: active ? colors.background : colors.mutedForeground,
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

  // Card
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },

  // Generated outfit preview row
  previewRow: {
    flexDirection: "row",
    gap: 10,
  },
  preview: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImg: {
    width: "100%",
    height: "100%",
  },

  // Lookbook mini-canvas
  lookbookContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  lookbookCanvas: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#FAF7F0",
    overflow: "hidden",
  },

  // Card footer
  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 0,
  },
  badgeLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
});
