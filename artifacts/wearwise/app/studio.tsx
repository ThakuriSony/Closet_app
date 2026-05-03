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
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarRenderer, getBodyZones } from "@/components/AvatarRenderer";
import { CanvasItem, CANVAS_ITEM_SIZE } from "@/components/CanvasItem";
import { SelectItemsModal } from "@/components/SelectItemsModal";
import { useAvatar } from "@/contexts/AvatarContext";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";
import type { Category, ClothingItem, LookbookItem, LookbookMeta } from "@/types";

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

type ViewMode = "flat" | "on_me";

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function displayUri(item: ClothingItem): string {
  return item.processedImageUri && item.processedImageUri.length > 0
    ? item.processedImageUri
    : item.imageUri;
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
// Map clothing category → body zone key
// ---------------------------------------------------------------------------

function zoneKey(category: Category): keyof ReturnType<typeof getBodyZones> | null {
  switch (category) {
    case "Top":       return "top";
    case "Outerwear": return "outerwear";
    case "Bottom":    return "bottom";
    case "Dress":     return "dress";
    case "Shoes":     return "shoes";
    default:          return null; // Accessories: skip for now
  }
}

// ---------------------------------------------------------------------------
// Avatar prompt modal
// ---------------------------------------------------------------------------

function AvatarPromptModal({
  visible,
  onClose,
  onCreate,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.promptOverlay} onPress={onClose}>
        <Pressable
          style={[styles.promptCard, { backgroundColor: colors.background }]}
          onPress={() => {}}
        >
          <View style={[styles.promptIconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="user" size={28} color={colors.foreground} />
          </View>
          <Text style={[styles.promptTitle, { color: colors.foreground }]}>
            Create your avatar to see outfits on you
          </Text>
          <Text style={[styles.promptSub, { color: colors.mutedForeground }]}>
            Set up a stylized avatar based on your measurements and preferences.
          </Text>
          <Pressable
            onPress={onCreate}
            style={({ pressed }) => [
              styles.promptPrimary,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.promptPrimaryText, { color: colors.primaryForeground }]}>
              Create my avatar
            </Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.promptSecondary, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.promptSecondaryText, { color: colors.mutedForeground }]}>
              Not now
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function StudioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { outfits, items, addOutfit, updateOutfit, getItem } = useWardrobe();
  const { avatar } = useAvatar();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [viewMode, setViewMode] = useState<ViewMode>("flat");
  const [showAvatarPrompt, setShowAvatarPrompt] = useState(false);
  const [onMeError, setOnMeError] = useState(false);

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
    if (
      canvasDims.width === 0 ||
      !existingOutfit?.layout?.length ||
      loadedRef.current
    )
      return;
    loadedRef.current = true;

    const meta = existingOutfit.layoutMeta;
    const cW = meta?.canvasW ?? canvasDims.width;
    const cH = meta?.canvasH ?? canvasDims.height;

    const maxZ = existingOutfit.layout.reduce(
      (m, l) => Math.max(m, l.z ?? 0),
      0,
    );
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
  // View mode toggle
  // -------------------------------------------------------------------------

  const handleViewModeToggle = (mode: ViewMode) => {
    if (mode === "on_me") {
      if (avatar.avatar_status !== "confirmed" || !avatar.avatar_config) {
        setShowAvatarPrompt(true);
        return;
      }
      setOnMeError(false);
    }
    setViewMode(mode);
  };

  // -------------------------------------------------------------------------
  // On-me: deduplicate items by category (highest-z wins per category)
  // -------------------------------------------------------------------------

  const onMeItems = useMemo<ClothingItem[]>(() => {
    if (viewMode !== "on_me") return [];
    const byCategory = new Map<string, { item: ClothingItem; z: number }>();
    for (const entry of canvasEntries) {
      const item = getItem(entry.itemId);
      if (!item) continue;
      const existing = byCategory.get(item.category);
      if (!existing || entry.z > existing.z) {
        byCategory.set(item.category, { item, z: entry.z });
      }
    }
    return Array.from(byCategory.values()).map((v) => v.item);
  }, [viewMode, canvasEntries, getItem]);

  // -------------------------------------------------------------------------
  // Canvas item helpers
  // -------------------------------------------------------------------------

  const initialPosition = useCallback(
    (index: number): { x: number; y: number } => {
      const { width, height } = canvasDims;
      const baseX = width > 0 ? (width - CANVAS_ITEM_SIZE) / 2 : 80;
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
          return {
            id: genId(),
            itemId,
            ...initialPosition(prev.length + i),
            scale: 1,
            z,
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
    zCounterRef.current += 1;
    const z = zCounterRef.current;
    setCanvasEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, z } : e)),
    );
  }, []);

  const handleDeleteSelected = () => {
    if (!selectedEntryId) return;
    setCanvasEntries((prev) => prev.filter((e) => e.id !== selectedEntryId));
    setSelectedEntryId(null);
  };

  const sortedEntries = useMemo(
    () => [...canvasEntries].sort((a, b) => a.z - b.z),
    [canvasEntries],
  );

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    if (canvasEntries.length === 0) {
      Alert.alert("Canvas is empty", "Add at least one item before saving.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

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
  // On-me render
  // -------------------------------------------------------------------------

  const renderOnMe = () => {
    const config = avatar.avatar_config;
    if (!config || onMeError) {
      return (
        <View style={[styles.canvas, { backgroundColor: "#FAF7F0", alignItems: "center", justifyContent: "center" }]}>
          <View style={[styles.fallbackBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="alert-circle" size={14} color={colors.mutedForeground} />
            <Text style={[styles.fallbackText, { color: colors.mutedForeground }]}>
              Showing flat view instead
            </Text>
          </View>
          {renderFlatCanvas()}
        </View>
      );
    }

    const avatarSize = Math.min(canvasDims.width * 0.56, 210);
    let zones: ReturnType<typeof getBodyZones> | null = null;
    try {
      zones = getBodyZones(config, avatarSize);
    } catch {
      setOnMeError(true);
      return null;
    }

    const avatarH = zones.avatarTotalHeight;
    const canvasH = canvasDims.height;
    const topPad = Math.max(16, (canvasH - avatarH) * 0.18);

    return (
      <ScrollView
        style={[styles.canvas, { backgroundColor: "#F5F3EE" }]}
        contentContainerStyle={[
          styles.onMeContent,
          { paddingTop: topPad, paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {canvasEntries.length === 0 && (
          <View style={styles.onMeHint} pointerEvents="none">
            <Text style={[styles.onMeHintText, { color: colors.mutedForeground }]}>
              Add items below to see them on your avatar
            </Text>
          </View>
        )}

        <View style={{ width: avatarSize, height: avatarH, position: "relative" }}>
          {/* Avatar base */}
          <AvatarRenderer config={config} size={avatarSize} />

          {/* Clothing overlays */}
          {onMeItems.map((item) => {
            const key = zoneKey(item.category);
            if (!key || !zones) return null;
            const zone = zones[key] as { left: number; top: number; width: number; height: number };
            return (
              <Image
                key={item.id}
                source={{ uri: displayUri(item) }}
                style={[styles.onMeCloth, zone]}
                contentFit="contain"
              />
            );
          })}
        </View>

        {canvasEntries.length > 0 && onMeItems.length === 0 && (
          <Text style={[styles.onMeHintText, { color: colors.mutedForeground, marginTop: 12 }]}>
            None of the added items can be shown on the avatar yet
          </Text>
        )}
      </ScrollView>
    );
  };

  // -------------------------------------------------------------------------
  // Flat canvas render
  // -------------------------------------------------------------------------

  const emptyCloset = items.length === 0;

  const renderFlatCanvas = () => (
    <View
      style={[styles.canvas, { backgroundColor: "#FAF7F0" }]}
      onLayout={(e) =>
        setCanvasDims({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      <CanvasGrid width={canvasDims.width} height={canvasDims.height} />

      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={() => setSelectedEntryId(null)}
      />

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
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, borderBottomColor: colors.border },
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
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveLabel, { color: colors.primaryForeground }]}>
              {id ? "Update" : "Save"}
            </Text>
          )}
        </Pressable>
      </View>

      {/* View mode segmented toggle */}
      <View
        style={[
          styles.toggleRow,
          { backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.togglePill, { backgroundColor: colors.secondary }]}>
          {(["flat", "on_me"] as ViewMode[]).map((mode) => {
            const active = viewMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => handleViewModeToggle(mode)}
                style={({ pressed }) => [
                  styles.toggleSeg,
                  active && { backgroundColor: colors.primary, borderRadius: 999 },
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.toggleLabel,
                    {
                      color: active
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {mode === "flat" ? "Flat view" : "On me"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Canvas area — measure once for the flat layout ref */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => {
          if (viewMode === "on_me") {
            setCanvasDims({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            });
          }
        }}
      >
        {viewMode === "flat" ? renderFlatCanvas() : renderOnMe()}
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
        <Pressable
          onPress={handleDeleteSelected}
          disabled={!selectedEntryId || viewMode === "on_me"}
          hitSlop={10}
          style={({ pressed }) => [
            styles.barIcon,
            {
              opacity:
                selectedEntryId && viewMode === "flat"
                  ? pressed ? 0.5 : 1
                  : 0.25,
            },
          ]}
        >
          <Feather
            name="trash-2"
            size={22}
            color={
              selectedEntryId && viewMode === "flat"
                ? colors.foreground
                : colors.mutedForeground
            }
          />
        </Pressable>

        {viewMode === "on_me" ? (
          <Text style={[styles.barHint, { color: colors.mutedForeground }]}>
            See how this outfit fits your body
          </Text>
        ) : selectedEntryId ? (
          <Text style={[styles.barHint, { color: colors.mutedForeground }]}>
            Item selected
          </Text>
        ) : (
          <Text style={[styles.barHint, { color: colors.mutedForeground }]}>
            Drag · Pinch to scale
          </Text>
        )}

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
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
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

      <AvatarPromptModal
        visible={showAvatarPrompt}
        onClose={() => setShowAvatarPrompt(false)}
        onCreate={() => {
          setShowAvatarPrompt(false);
          router.push("/avatar-setup");
        }}
        colors={colors}
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

  toggleRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  togglePill: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  toggleSeg: {
    paddingHorizontal: 20,
    paddingVertical: 7,
  },
  toggleLabel: {
    fontSize: 13,
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
  },
  hintText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(0,0,0,0.28)",
  },

  onMeContent: {
    alignItems: "center",
    flexGrow: 1,
  },
  onMeHint: {
    position: "absolute",
    bottom: -36,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  onMeHintText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  onMeCloth: {
    position: "absolute",
  },

  fallbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  fallbackText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
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

  promptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  promptCard: {
    width: "100%",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  promptIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  promptTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 24,
  },
  promptSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  promptPrimary: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8,
  },
  promptPrimaryText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  promptSecondary: {
    paddingVertical: 8,
  },
  promptSecondaryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
