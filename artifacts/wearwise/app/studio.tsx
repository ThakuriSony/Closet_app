import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CanvasItem, CANVAS_ITEM_SIZE } from "@/components/CanvasItem";
import { SelectItemsModal } from "@/components/SelectItemsModal";
import { useStyleProfile } from "@/contexts/StyleProfileContext";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";
import { getStyleInsights } from "@/services/styleInsightEngine";
import type { ClothingItem, LookbookItem, LookbookMeta } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CanvasEntry {
  id: string;
  itemId: string;
  x: number;
  y: number;
  scale: number;
  z: number;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function displayUri(item: ClothingItem): string {
  return item.processedImageUri && item.processedImageUri.length > 0
    ? item.processedImageUri
    : item.imageUri;
}

// ---------------------------------------------------------------------------
// Canvas grid
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
        <View key={`h${yy}`} style={{ position: "absolute", left: 0, right: 0, top: yy, height: LINE_W, backgroundColor: LINE_COLOR }} />
      ))}
      {vLines.map((xx) => (
        <View key={`v${xx}`} style={{ position: "absolute", top: 0, bottom: 0, left: xx, width: LINE_W, backgroundColor: LINE_COLOR }} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Style insights panel
// ---------------------------------------------------------------------------

function InsightsPanel({
  colors,
  profile,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  profile: import("@/contexts/StyleProfileContext").StyleProfileData;
}) {
  const [open, setOpen] = useState(false);
  const insights = getStyleInsights(profile);

  if (!insights.hasData) return null;

  return (
    <View style={[panelStyles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [panelStyles.header, { opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={panelStyles.headerLeft}>
          <Feather name="star" size={14} color={colors.primary} />
          <Text style={[panelStyles.headerText, { color: colors.foreground }]}>
            What looks good on you
          </Text>
        </View>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </Pressable>

      {open && (
        <View style={panelStyles.body}>
          {insights.color.length > 0 && (
            <InsightGroup icon="droplet" label="Colours" bullets={insights.color} colors={colors} />
          )}
          {insights.silhouette.length > 0 && (
            <InsightGroup icon="layers" label="Silhouette" bullets={insights.silhouette} colors={colors} />
          )}
          {insights.length.length > 0 && (
            <InsightGroup icon="arrow-down" label="Lengths" bullets={insights.length} colors={colors} />
          )}
          <Text style={[panelStyles.disclaimer, { color: colors.mutedForeground }]}>
            These are style suggestions, not rules. Wear what makes you feel good.
          </Text>
        </View>
      )}
    </View>
  );
}

function InsightGroup({
  icon,
  label,
  bullets,
  colors,
}: {
  icon: string;
  label: string;
  bullets: string[];
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={panelStyles.group}>
      <View style={panelStyles.groupHeader}>
        <Feather name={icon as any} size={12} color={colors.primary} />
        <Text style={[panelStyles.groupLabel, { color: colors.primary }]}>{label}</Text>
      </View>
      {bullets.map((b, i) => (
        <View key={i} style={panelStyles.bulletRow}>
          <View style={[panelStyles.dot, { backgroundColor: colors.mutedForeground }]} />
          <Text style={[panelStyles.bulletText, { color: colors.mutedForeground }]}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

const panelStyles = StyleSheet.create({
  wrap: { marginHorizontal: 12, marginBottom: 6, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  headerText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  body: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  group: { gap: 6 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 5 },
  groupLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingLeft: 4 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 6, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  disclaimer: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic", marginTop: 4 },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function StudioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { outfits, items, addOutfit, updateOutfit, getItem } = useWardrobe();
  const { profile } = useStyleProfile();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [canvasEntries, setCanvasEntries] = useState<CanvasEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });
  const [saving, setSaving] = useState(false);

  const zCounterRef = useRef(0);
  const loadedRef = useRef(false);

  const existingOutfit = useMemo(
    () => (id ? outfits.find((o) => o.id === id) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  useEffect(() => {
    if (canvasDims.width === 0 || !existingOutfit?.layout?.length || loadedRef.current) return;
    loadedRef.current = true;

    const meta = existingOutfit.layoutMeta;
    const cW = meta?.canvasW ?? canvasDims.width;
    const cH = meta?.canvasH ?? canvasDims.height;
    const maxZ = existingOutfit.layout.reduce((m, l) => Math.max(m, l.z ?? 0), 0);
    zCounterRef.current = maxZ;

    setCanvasEntries(
      existingOutfit.layout.map((l, idx) => ({
        id: genId(),
        itemId: l.itemId,
        x: l.nx * cW,
        y: l.ny * cH,
        scale: l.s,
        z: l.z ?? idx,
      })),
    );
  }, [canvasDims.width, canvasDims.height, existingOutfit]);

  // -------------------------------------------------------------------------
  // Canvas item helpers
  // -------------------------------------------------------------------------

  const initialPosition = useCallback(
    (index: number): { x: number; y: number } => {
      const { width, height } = canvasDims;
      const baseX = width  > 0 ? (width  - CANVAS_ITEM_SIZE) / 2 : 80;
      const baseY = height > 0 ? (height - CANVAS_ITEM_SIZE) / 2 : 120;
      return { x: baseX + index * 28, y: baseY + index * 28 };
    },
    [canvasDims],
  );

  const handleImport = useCallback(
    (itemIds: string[]) => {
      setCanvasEntries((prev) => {
        const maxZ = prev.reduce((m, e) => Math.max(m, e.z), 0);
        const newEntries = itemIds.map((itemId, i) => {
          const z = maxZ + i + 1;
          zCounterRef.current = z;
          return { id: genId(), itemId, ...initialPosition(prev.length + i), scale: 1, z };
        });
        return [...prev, ...newEntries];
      });
    },
    [initialPosition],
  );

  const handleMove = useCallback((entryId: string, x: number, y: number, scale: number) => {
    setCanvasEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, x, y, scale } : e)));
  }, []);

  const handleSelect = useCallback((entryId: string) => {
    setSelectedEntryId((prev) => (prev === entryId ? null : entryId));
    zCounterRef.current += 1;
    const z = zCounterRef.current;
    setCanvasEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, z } : e)));
  }, []);

  const handleDeleteSelected = () => {
    if (!selectedEntryId) return;
    setCanvasEntries((prev) => prev.filter((e) => e.id !== selectedEntryId));
    setSelectedEntryId(null);
  };

  const sortedEntries = useMemo(() => [...canvasEntries].sort((a, b) => a.z - b.z), [canvasEntries]);

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    if (canvasEntries.length === 0) {
      Alert.alert("Canvas is empty", "Add at least one item before saving.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSaving(true);
    try {
      const cW = canvasDims.width;
      const cH = canvasDims.height;
      const layout: LookbookItem[] = canvasEntries.map((e) => ({
        itemId: e.itemId,
        nx: cW > 0 ? e.x / cW : 0,
        ny: cH > 0 ? e.y / cH : 0,
        s: e.scale,
        z: e.z,
      }));
      const layoutMeta: LookbookMeta = {
        canvasW: cW,
        canvasH: cH,
        baseSizeFactor: cW > 0 ? CANVAS_ITEM_SIZE / cW : 0.38,
      };
      const itemIds = [...new Set(canvasEntries.map((e) => e.itemId))];

      if (id) {
        await updateOutfit(id, { itemIds, layout, layoutMeta, type: "lookbook" });
      } else {
        await addOutfit(itemIds, { type: "lookbook", layout, layoutMeta });
      }

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {id ? "Edit Look" : "Studio"}
        </Text>
        <Pressable
          onPress={() => { void handleSave(); }}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveLabel, { color: colors.primaryForeground }]}>
              {id ? "Update" : "Save"}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Style insights collapsible panel */}
      <InsightsPanel colors={colors} profile={profile} />

      {/* Flat canvas */}
      <View
        style={[styles.canvas, { backgroundColor: "#FAF7F0" }]}
        onLayout={(e) => setCanvasDims({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        <CanvasGrid width={canvasDims.width} height={canvasDims.height} />

        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSelectedEntryId(null)} />

        {sortedEntries.map((entry) => {
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

        {canvasEntries.length === 0 && emptyCloset && (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>Add items to your Closet first</Text>
          </View>
        )}
      </View>

      {/* Bottom action bar */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + 10, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleDeleteSelected}
          disabled={!selectedEntryId}
          hitSlop={10}
          style={({ pressed }) => [styles.barIcon, { opacity: selectedEntryId ? (pressed ? 0.5 : 1) : 0.25 }]}
        >
          <Feather name="trash-2" size={22} color={selectedEntryId ? colors.foreground : colors.mutedForeground} />
        </Pressable>

        {selectedEntryId ? (
          <Text style={[styles.barHint, { color: colors.mutedForeground }]}>Item selected</Text>
        ) : (
          <Text style={[styles.barHint, { color: colors.mutedForeground }]}>Drag · Pinch to scale</Text>
        )}

        <Pressable
          onPress={() => {
            if (emptyCloset) {
              Alert.alert("Closet is empty", "Add some clothing items to your Closet first.");
              return;
            }
            setShowPicker(true);
          }}
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  canvas: { flex: 1, overflow: "hidden" },

  hint: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  hintText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#9CA3AF" },

  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  barIcon: { padding: 4 },
  barHint: { flex: 1, textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
