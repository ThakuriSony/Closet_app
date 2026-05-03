import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { ItemTile } from "@/components/ItemTile";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";
import type { Category } from "@/types";

const SLOTS: Category[] = ["Top", "Bottom", "Shoes"];
const COLUMN_COUNT = 3;
const GAP = 10;
const H_PADDING = 20;

export default function CreateOutfitScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, addOutfit } = useWardrobe();

  const [activeSlot, setActiveSlot] = useState<Category>("Top");
  const [selection, setSelection] = useState<Record<Category, string | null>>({
    Top: null,
    Bottom: null,
    Dress: null,
    Shoes: null,
    Outerwear: null,
    Accessories: null,
  });
  const [saving, setSaving] = useState(false);

  const itemsForSlot = useMemo(
    () => items.filter((i) => i.category === activeSlot),
    [items, activeSlot],
  );

  const [containerWidth, setContainerWidth] = useState(0);
  const tileWidth =
    containerWidth > 0
      ? (containerWidth - H_PADDING * 2 - GAP * (COLUMN_COUNT - 1)) /
        COLUMN_COUNT
      : 0;

  const allSelected = SLOTS.every((s) => selection[s] !== null);

  const onSave = async () => {
    if (!allSelected) {
      Alert.alert("Pick all three", "Select a top, bottom, and shoes.");
      return;
    }
    setSaving(true);
    try {
      const ids = SLOTS.map((s) => selection[s] as string);
      await addOutfit(ids);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch {
      Alert.alert("Could not save", "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[styles.root, { backgroundColor: colors.background }]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.slotRow, { paddingHorizontal: H_PADDING }]}>
        {SLOTS.map((slot) => {
          const selectedId = selection[slot];
          const selectedItem = selectedId
            ? items.find((i) => i.id === selectedId)
            : null;
          const active = activeSlot === slot;
          return (
            <Pressable
              key={slot}
              onPress={() => setActiveSlot(slot)}
              style={({ pressed }) => [
                styles.slot,
                {
                  backgroundColor: selectedItem
                    ? colors.card
                    : colors.secondary,
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {selectedItem ? (
                <ItemTile
                  item={selectedItem}
                  width={(containerWidth - H_PADDING * 2 - 20) / 3}
                />
              ) : (
                <View style={styles.slotEmpty}>
                  <Feather
                    name="plus"
                    size={20}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.slotLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {slot}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.divider} />

      <View style={[styles.tabsRow, { paddingHorizontal: H_PADDING }]}>
        {SLOTS.map((slot) => {
          const active = activeSlot === slot;
          return (
            <Pressable
              key={slot}
              onPress={() => setActiveSlot(slot)}
              style={({ pressed }) => [
                styles.tab,
                {
                  borderBottomColor: active ? colors.primary : "transparent",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: active ? colors.primary : colors.mutedForeground,
                  },
                ]}
              >
                {slot}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {itemsForSlot.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            icon="package"
            title={`No ${activeSlot.toLowerCase()} items`}
            description={`Add a ${activeSlot.toLowerCase()} to your closet to use it in outfits.`}
          />
        </View>
      ) : (
        <FlatList
          data={itemsForSlot}
          keyExtractor={(i) => i.id}
          numColumns={COLUMN_COUNT}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{
            paddingHorizontal: H_PADDING,
            paddingTop: 12,
            paddingBottom: insets.bottom + 110,
            gap: GAP,
          }}
          renderItem={({ item }) => {
            const selected = selection[activeSlot] === item.id;
            return (
              <ItemTile
                item={item}
                width={tileWidth}
                selected={selected}
                onPress={() => {
                  setSelection((prev) => ({
                    ...prev,
                    [activeSlot]: selected ? null : item.id,
                  }));
                }}
              />
            );
          }}
        />
      )}

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={onSave}
          disabled={saving || !allSelected}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: allSelected
                ? colors.primary
                : colors.muted,
              opacity: saving ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text
              style={[
                styles.saveLabel,
                {
                  color: allSelected
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                },
              ]}
            >
              Save Outfit
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slotRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 16,
    paddingBottom: 16,
  },
  slot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  slotEmpty: {
    alignItems: "center",
    gap: 6,
  },
  slotLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 18,
    paddingTop: 14,
  },
  tab: {
    paddingBottom: 10,
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
