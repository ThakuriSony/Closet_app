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
import type { Outfit } from "@/types";

const H_PADDING = 20;

type OutfitFilter = "All" | "Favorites";

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

        {/* Studio "Create Look" button */}
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
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
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
