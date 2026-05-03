import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { ItemTile } from "@/components/ItemTile";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";
import { CATEGORIES, type Category, type ClothingItem } from "@/types";

const GAP = 14;
const H_PADDING = 20;

// A small set of pleasing aspect ratios we deterministically pick from per
// item so the masonry feels varied without ever shuffling between renders.
const ASPECT_RATIOS = [3 / 4, 4 / 5, 1, 5 / 6, 4 / 5, 3 / 4];

function aspectRatioFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return ASPECT_RATIOS[hash % ASPECT_RATIOS.length];
}

function distributeMasonry<T extends { id: string }>(
  items: T[],
): { item: T; aspectRatio: number }[][] {
  const columns: { item: T; aspectRatio: number }[][] = [[], []];
  // Track normalized height per column (1/aspectRatio = relative height when
  // the column width is 1). Greedy place each item into the shorter column.
  const heights = [0, 0];
  for (const item of items) {
    const ratio = aspectRatioFor(item.id);
    const target = heights[0] <= heights[1] ? 0 : 1;
    columns[target].push({ item, aspectRatio: ratio });
    heights[target] += 1 / ratio;
  }
  return columns;
}

type Filter = "All" | "Favorites" | Category;
type ViewMode = "Closet" | "Laundry";

const WASHABLE: ReadonlySet<string> = new Set(["Top", "Bottom", "Dress", "Outerwear"]);

export default function ClosetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, markItemWashed, toggleItemFavorite } = useWardrobe();
  const [filter, setFilter] = useState<Filter>("All");
  const [mode, setMode] = useState<ViewMode>("Closet");

  const dirtyCount = useMemo(
    () => items.filter((i) => i.status === "dirty" && WASHABLE.has(i.category)).length,
    [items],
  );

  const cleanItems = useMemo(
    () => items.filter((i) => i.status !== "dirty"),
    [items],
  );

  const dirtyItems = useMemo(
    () => items.filter((i) => i.status === "dirty" && WASHABLE.has(i.category)),
    [items],
  );

  const filtered = useMemo(() => {
    if (filter === "All") return cleanItems;
    if (filter === "Favorites") return cleanItems.filter((i) => i.isFavorite);
    return cleanItems.filter((i) => i.category === filter);
  }, [cleanItems, filter]);

  const masonryColumns = useMemo(() => distributeMasonry(filtered), [filtered]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const tabBarOffset = Platform.OS === "web" ? 100 : 110;

  const onAdd = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/add-item");
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
    >
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
            {mode === "Closet" ? "My Closet" : "Laundry"}
          </Text>
        </View>
        {mode === "Closet" ? (
          <Pressable
            onPress={onAdd}
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
        ) : (
          <View style={styles.addBtn} />
        )}
      </View>

      <View style={styles.modeRow}>
        <ModeToggle
          value={mode}
          onChange={setMode}
          dirtyCount={dirtyCount}
        />
      </View>

      {mode === "Closet" ? (
        <>
          <View style={styles.filterRow}>
            <FilterChips value={filter} onChange={setFilter} />
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="package"
                title="Your closet is empty"
                description="Tap the + button to add your first clothing item."
              />
            </View>
          ) : cleanItems.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="droplet"
                title="All items are in laundry"
                description="Mark items as washed in the Laundry tab to bring them back here."
              />
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ paddingTop: 60 }}>
              <EmptyState
                icon={filter === "Favorites" ? "heart" : "filter"}
                title={
                  filter === "Favorites"
                    ? "No favorites yet"
                    : `No ${filter.toLowerCase()} items`
                }
                description={
                  filter === "Favorites"
                    ? "Tap the heart on any item to save it here."
                    : "Try a different filter or add a new item."
                }
              />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: H_PADDING,
                paddingTop: 4,
                paddingBottom: insets.bottom + tabBarOffset,
              }}
            >
              <View style={styles.masonryRow}>
                {masonryColumns.map((column, columnIndex) => (
                  <View
                    key={columnIndex}
                    style={[styles.masonryColumn, { gap: GAP }]}
                  >
                    {column.map(({ item }) => (
                      <ItemTile
                        key={item.id}
                        item={item}
                        aspectRatio={1}
                        onPress={() => router.push(`/item/${item.id}`)}
                        onToggleFavorite={() => {
                          if (Platform.OS !== "web") {
                            Haptics.selectionAsync();
                          }
                          void toggleItemFavorite(item.id);
                        }}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </>
      ) : (
        <FlatList
          data={dirtyItems}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{
            paddingHorizontal: H_PADDING,
            paddingTop: 4,
            paddingBottom: insets.bottom + tabBarOffset,
            gap: 12,
          }}
          renderItem={({ item }) => (
            <LaundryRow
              item={item}
              onWash={() => {
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                }
                void markItemWashed(item.id);
              }}
            />
          )}
          ListEmptyComponent={
            <View style={{ paddingTop: 80 }}>
              <EmptyState
                icon="check-circle"
                title="No items in laundry"
                description="Items move here automatically once you wear them past your set threshold."
              />
            </View>
          }
        />
      )}
    </View>
  );
}

function ModeToggle({
  value,
  onChange,
  dirtyCount,
}: {
  value: ViewMode;
  onChange: (m: ViewMode) => void;
  dirtyCount: number;
}) {
  const colors = useColors();
  const options: ViewMode[] = ["Closet", "Laundry"];
  return (
    <View
      style={[
        styles.modeWrap,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={({ pressed }) => [
              styles.modeBtn,
              {
                backgroundColor: active
                  ? colors.foreground
                  : "transparent",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.modeText,
                {
                  color: active ? colors.primaryForeground : colors.mutedForeground,
                },
              ]}
            >
              {opt}
              {opt === "Laundry" && dirtyCount > 0
                ? ` · ${dirtyCount}`
                : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LaundryRow({
  item,
  onWash,
}: {
  item: ClothingItem;
  onWash: () => void;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.laundryRow,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: colors.secondary }]}>
        <Image
          source={{ uri: item.imageUri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.laundryTitle, { color: colors.foreground }]}>
          {item.category}
          {item.color ? ` · ${item.color}` : ""}
        </Text>
        <Text
          style={[styles.laundryMeta, { color: colors.mutedForeground }]}
        >
          Worn {item.wearCount} {item.wearCount === 1 ? "time" : "times"}
        </Text>
      </View>
      <Pressable
        onPress={onWash}
        style={({ pressed }) => [
          styles.washBtn,
          {
            borderColor: colors.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Feather name="droplet" size={14} color={colors.primary} />
        <Text style={[styles.washLabel, { color: colors.primary }]}>
          Mark as Washed
        </Text>
      </Pressable>
    </View>
  );
}

function FilterChips({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
}) {
  const colors = useColors();
  const all: Filter[] = ["All", "Favorites", ...CATEGORIES];
  return (
    <View style={{ paddingHorizontal: H_PADDING }}>
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
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                },
              ]}
            >
              {isFav ? (
                <Feather
                  name="heart"
                  size={12}
                  color={active ? colors.primaryForeground : colors.mutedForeground}
                />
              ) : null}
              <Text
                style={[
                  styles.chipLabel,
                  {
                    color: active ? colors.primaryForeground : colors.mutedForeground,
                  },
                ]}
              >
                {c}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

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
  modeRow: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 12,
  },
  modeWrap: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 999,
  },
  modeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  filterRow: {
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
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  emptyWrap: {
    flex: 1,
  },
  masonryRow: {
    flexDirection: "row",
    gap: GAP,
  },
  masonryColumn: {
    flex: 1,
  },
  laundryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
  },
  laundryTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  laundryMeta: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  washBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  washLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
