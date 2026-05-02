import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CanvasItem, CANVAS_ITEM_SIZE } from "@/components/CanvasItem";
import { SelectItemsModal } from "@/components/SelectItemsModal";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";
import type { LookbookItem } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CanvasEntry {
  id: string; // unique per canvas slot (allows same item twice)
  itemId: string;
  x: number;
  y: number;
  scale: number;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------------------------------------------------------------------------
// Decorative grid lines for the canvas background
// ---------------------------------------------------------------------------

const LINE_COLOR = "#D3D3D3";
const LINE_SPACING = 30;
const LINE_W = StyleSheet.hairlineWidth;

function CanvasGrid({ width, height }: { width: number; height: number }) {
  if (width === 0 || height === 0) return null;

  const hLines: number[] = [];
  for (let yy = LINE_SPACING; yy < height; yy += LINE_SPACING) hLines.push(yy);

  const vLines: number[] = [];
  for (let xx = LINE_SPACING; xx < width; xx += LINE_SPACING) vLines.push(xx);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {hLines.map((yy) => (
        <View
          key={`h${yy}`}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: yy,
            height: LINE_W,
            backgroundColor: LINE_COLOR,
          }}
        />
      ))}
      {vLines.map((xx) => (
        <View
          key={`v${xx}`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: xx,
            width: LINE_W,
            backgroundColor: LINE_COLOR,
          }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function StudioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { outfits, items, addOutfit, updateOutfit, getItem } = useWardrobe();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [canvasEntries, setCanvasEntries] = useState<CanvasEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });
  const [saving, setSaving] = useState(false);

  // Preload existing layout when editing a saved lookbook outfit.
  const existingOutfit = useMemo(
    () => (id ? outfits.find((o) => o.id === id) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id], // intentionally shallow — only run once on mount
  );

  useEffect(() => {
    if (existingOutfit?.layout && existingOutfit.layout.length > 0) {
      setCanvasEntries(
        existingOutfit.layout.map((l) => ({
          id: genId(),
          itemId: l.itemId,
          x: l.x,
          y: l.y,
          scale: l.scale,
        })),
      );
    }
  }, [existingOutfit]);

  // -------------------------------------------------------------------------
  // Canvas item helpers
  // -------------------------------------------------------------------------

  const initialPosition = useCallback(
    (index: number): { x: number; y: number } => {
      const { width, height } = canvasDims;
      const baseX =
        width > 0 ? (width - CANVAS_ITEM_SIZE) / 2 : 80;
      const baseY =
        height > 0 ? (height - CANVAS_ITEM_SIZE) / 2 : 120;
      return {
        x: baseX + index * 24,
        y: baseY + index * 24,
      };
    },
    [canvasDims],
  );

  const handleImport = useCallback(
    (itemIds: string[]) => {
      setCanvasEntries((prev) => {
        const newEntries = itemIds.map((itemId, i) => {
          const pos = initialPosition(prev.length + i);
          return {
            id: genId(),
            itemId,
            x: pos.x,
            y: pos.y,
            scale: 1,
          };
        });
        return [...prev, ...newEntries];
      });
    },
    [initialPosition],
  );

  const handleMove = useCallback(
    (entryId: string, x: number, y: number, scale: number) => {
      setCanvasEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, x, y, scale } : e)),
      );
    },
    [],
  );

  const handleSelect = useCallback((entryId: string) => {
    setSelectedEntryId((prev) => (prev === entryId ? null : entryId));
  }, []);

  const handleDeleteSelected = () => {
    if (!selectedEntryId) return;
    setCanvasEntries((prev) => prev.filter((e) => e.id !== selectedEntryId));
    setSelectedEntryId(null);
  };

  const handleCanvasTap = () => {
    setSelectedEntryId(null);
  };

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    if (canvasEntries.length === 0) {
      Alert.alert(
        "Canvas is empty",
        "Add at least one item before saving.",
      );
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setSaving(true);
    try {
      const layout: LookbookItem[] = canvasEntries.map((e) => ({
        itemId: e.itemId,
        x: e.x,
        y: e.y,
        scale: e.scale,
      }));
      const itemIds = [...new Set(canvasEntries.map((e) => e.itemId))];

      if (id) {
        // Edit mode — update existing outfit.
        await updateOutfit(id, { itemIds, layout, type: "lookbook" });
      } else {
        // Create mode.
        await addOutfit(itemIds, { type: "lookbook", layout });
      }

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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const emptyCloset = items.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {id ? "Edit Look" : "Studio"}
        </Text>

        <Pressable
          onPress={() => { void handleSave(); }}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color={colors.primaryForeground}
            />
          ) : (
            <Text
              style={[styles.saveLabel, { color: colors.primaryForeground }]}
            >
              {id ? "Update" : "Save"}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Canvas */}
      <View
        style={[styles.canvas, { backgroundColor: "#FAF7F0" }]}
        onLayout={(e) =>
          setCanvasDims({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })
        }
      >
        <CanvasGrid
          width={canvasDims.width}
          height={canvasDims.height}
        />

        {/* Tap on blank canvas area to deselect */}
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleCanvasTap}
        />

        {canvasEntries.map((entry) => {
          const item = getItem(entry.itemId);
          if (!item) return null;
          return (
            <CanvasItem
              key={entry.id}
              entryId={entry.id}
              item={item}
              initialX={entry.x}
              initialY={entry.y}
              initialScale={entry.scale}
              isSelected={selectedEntryId === entry.id}
              onSelect={handleSelect}
              onMove={handleMove}
            />
          );
        })}

        {/* Empty state hint */}
        {canvasEntries.length === 0 && (
          <View style={styles.hint} pointerEvents="none">
            <Feather
              name="plus-circle"
              size={36}
              color="rgba(0,0,0,0.15)"
            />
            <Text style={styles.hintText}>
              {emptyCloset
                ? "Add items to your Closet first"
                : "Tap + to add clothing items"}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom action bar */}
      <View
        style={[
          styles.bar,
          {
            paddingBottom: insets.bottom + 10,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        {/* Delete selected item */}
        <Pressable
          onPress={handleDeleteSelected}
          disabled={!selectedEntryId}
          hitSlop={10}
          style={({ pressed }) => [
            styles.barIcon,
            { opacity: selectedEntryId ? (pressed ? 0.5 : 1) : 0.25 },
          ]}
        >
          <Feather
            name="trash-2"
            size={22}
            color={selectedEntryId ? colors.foreground : colors.mutedForeground}
          />
        </Pressable>

        {/* Deselect / hint label */}
        {selectedEntryId ? (
          <Text style={[styles.barHint, { color: colors.mutedForeground }]}>
            Item selected
          </Text>
        ) : (
          <Text style={[styles.barHint, { color: colors.mutedForeground }]}>
            Drag · Pinch to scale
          </Text>
        )}

        {/* Add items */}
        <Pressable
          onPress={() => {
            if (emptyCloset) {
              Alert.alert(
                "Closet is empty",
                "Add some clothing items to your Closet first.",
              );
              return;
            }
            setShowPicker(true);
          }}
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

      <SelectItemsModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onImport={handleImport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  canvas: {
    flex: 1,
    overflow: "hidden",
  },

  hint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  hintText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(0,0,0,0.3)",
    textAlign: "center",
  },

  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  barIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  barHint: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
