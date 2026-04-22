import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";

export default function ItemDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getItem, removeItem } = useWardrobe();

  const item = id ? getItem(id) : undefined;

  if (!item) {
    return (
      <View
        style={[
          styles.missing,
          { backgroundColor: colors.background, paddingTop: insets.top + 40 },
        ]}
      >
        <Feather name="alert-circle" size={28} color={colors.mutedForeground} />
        <Text style={[styles.missingText, { color: colors.mutedForeground }]}>
          Item not found.
        </Text>
      </View>
    );
  }

  const onDelete = () => {
    Alert.alert("Delete item?", "This will also remove it from any outfits.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await removeItem(item.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
      >
        <View style={[styles.imageWrap, { backgroundColor: colors.secondary }]}>
          <Image
            source={{ uri: item.imageUri }}
            style={styles.image}
            contentFit="cover"
          />
        </View>

        <View style={styles.content}>
          <Text style={[styles.kicker, { color: colors.mutedForeground }]}>
            {item.category}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {item.color}
          </Text>

          {item.tags.length > 0 ? (
            <View style={styles.tagsWrap}>
              {item.tags.map((t) => (
                <View
                  key={t}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagLabel,
                      { color: colors.secondaryForeground },
                    ]}
                  >
                    {t}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View
            style={[
              styles.metaCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <MetaRow label="Category" value={item.category} />
            <Divider />
            <MetaRow label="Color" value={item.color} />
            <Divider />
            <MetaRow
              label="Added"
              value={new Date(item.createdAt).toLocaleDateString()}
            />
          </View>
        </View>
      </ScrollView>

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
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteBtn,
            {
              backgroundColor: colors.destructive,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="trash-2" size={16} color={colors.destructiveForeground} />
          <Text
            style={[styles.deleteLabel, { color: colors.destructiveForeground }]}
          >
            Delete Item
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.metaValue, { color: colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
  },
  image: { width: "100%", height: "100%" },
  content: { padding: 20 },
  kicker: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  metaCard: {
    marginTop: 22,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  metaLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  metaValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
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
  deleteBtn: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  missing: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  missingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
