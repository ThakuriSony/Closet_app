import { Feather } from "@expo/vector-icons";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryPicker } from "@/components/CategoryPicker";
import { EmptyState } from "@/components/EmptyState";
import { ItemTile } from "@/components/ItemTile";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";
import { CATEGORIES, type Category } from "@/types";

const COLUMN_COUNT = 2;
const GAP = 14;
const H_PADDING = 20;

type Filter = "All" | Category;

export default function ClosetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items } = useWardrobe();
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = useMemo(() => {
    if (filter === "All") return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  const [containerWidth, setContainerWidth] = useState<number>(0);
  const tileWidth =
    containerWidth > 0
      ? (containerWidth - H_PADDING * 2 - GAP * (COLUMN_COUNT - 1)) /
        COLUMN_COUNT
      : 0;

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
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
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
            My Closet
          </Text>
        </View>
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
      </View>

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
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          numColumns={COLUMN_COUNT}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{
            paddingHorizontal: H_PADDING,
            paddingTop: 4,
            paddingBottom: insets.bottom + tabBarOffset,
            gap: GAP,
          }}
          renderItem={({ item }) => (
            <ItemTile
              item={item}
              width={tileWidth}
              onPress={() => router.push(`/item/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={{ paddingTop: 60 }}>
              <EmptyState
                icon="filter"
                title={`No ${filter.toLowerCase()} items`}
                description="Try a different filter or add a new item."
              />
            </View>
          }
        />
      )}
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
  const all: Filter[] = ["All", ...CATEGORIES];
  return (
    <View style={{ paddingHorizontal: H_PADDING }}>
      <CategoryChipsRow>
        {all.map((c) => {
          const active = value === c;
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
      </CategoryChipsRow>
    </View>
  );
}

function CategoryChipsRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.chipRow}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 16,
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
});
