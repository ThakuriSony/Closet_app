import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";
import { CATEGORIES } from "@/types";
import type { Category } from "@/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  onImport: (itemIds: string[]) => void;
}

const TILE_GAP = 10;
const COLS = 3;

export function SelectItemsModal({ visible, onClose, onImport }: Props) {
  const colors = useColors();
  const { items } = useWardrobe();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<Category | null>(null);

  const filtered = useMemo(
    () => (category ? items.filter((i) => i.category === category) : items),
    [items, category],
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    if (selectedIds.size === 0) return;
    onImport([...selectedIds]);
    setSelectedIds(new Set());
    setCategory(null);
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setCategory(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Add Items
          </Text>
          <Pressable
            onPress={handleImport}
            disabled={selectedIds.size === 0}
            style={({ pressed }) => [
              styles.importBtn,
              {
                backgroundColor:
                  selectedIds.size > 0 ? colors.primary : colors.muted,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.importLabel,
                {
                  color:
                    selectedIds.size > 0
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                },
              ]}
            >
              {selectedIds.size > 0 ? `Add ${selectedIds.size}` : "Add"}
            </Text>
          </Pressable>
        </View>

        {/* Category filter chips */}
        <View style={styles.chipsRow}>
          <Pressable
            onPress={() => setCategory(null)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor:
                  category === null ? colors.foreground : colors.card,
                borderColor:
                  category === null ? colors.foreground : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.chipLabel,
                {
                  color:
                    category === null
                      ? colors.background
                      : colors.mutedForeground,
                },
              ]}
            >
              All
            </Text>
          </Pressable>
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(active ? null : cat)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color: active
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Item grid */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather
              name="package"
              size={32}
              color={colors.mutedForeground}
            />
            <Text
              style={[styles.emptyText, { color: colors.mutedForeground }]}
            >
              No items in this category.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            numColumns={COLS}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: TILE_GAP }}
            renderItem={({ item }) => {
              const selected = selectedIds.has(item.id);
              const uri =
                item.processedImageUri && item.processedImageUri.length > 0
                  ? item.processedImageUri
                  : item.imageUri;
              return (
                <Pressable
                  onPress={() => toggle(item.id)}
                  style={({ pressed }) => [
                    styles.tile,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: selected ? colors.foreground : "transparent",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Image
                    source={{ uri }}
                    style={styles.tileImg}
                    contentFit="cover"
                  />
                  {selected && (
                    <View
                      style={[
                        styles.check,
                        { backgroundColor: colors.foreground },
                      ]}
                    >
                      <Feather
                        name="check"
                        size={12}
                        color={colors.background}
                      />
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  importBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  importLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  grid: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: TILE_GAP,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
  },
  tileImg: {
    width: "100%",
    height: "100%",
  },
  check: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
