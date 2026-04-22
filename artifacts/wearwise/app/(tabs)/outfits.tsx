import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
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

export default function OutfitsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { outfits, items, removeOutfit } = useWardrobe();

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const tabBarOffset = Platform.OS === "web" ? 100 : 110;

  const canCreate = items.length > 0;

  const onCreate = () => {
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
    router.push("/create-outfit");
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
          onPress={onCreate}
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

      {outfits.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="layers"
            title="No outfits yet"
            description="Combine a top, bottom, and shoes to save your first outfit."
          />
        </View>
      ) : (
        <FlatList
          data={outfits}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{
            paddingHorizontal: H_PADDING,
            paddingTop: 8,
            paddingBottom: insets.bottom + tabBarOffset,
            gap: 14,
          }}
          renderItem={({ item }) => {
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
                  {outfitItems.map((it) => (
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
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    {outfitItems.map((i) => i.category).join(" · ")}
                  </Text>
                  <Pressable
                    onPress={() => onDelete(item)}
                    hitSlop={10}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Feather
                      name="trash-2"
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 20,
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
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
