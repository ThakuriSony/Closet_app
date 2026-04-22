import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryPicker } from "@/components/CategoryPicker";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";
import { analyzeClothingImage } from "@/services/aiTagging";
import type { Category } from "@/types";

type AiState =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "suggested" }
  | { status: "failed"; message: string };

export default function AddItemScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addItem } = useWardrobe();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("Top");
  const [color, setColor] = useState<string>("");
  const [tagsText, setTagsText] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [ai, setAi] = useState<AiState>({ status: "idle" });

  const [lastAsset, setLastAsset] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);

  const runAnalysis = async (base64: string, mimeType: string) => {
    setAi({ status: "analyzing" });
    try {
      const result = await analyzeClothingImage(base64, mimeType);
      setCategory(result.category);
      setColor(result.color);
      setTagsText(result.tags.join(", "));
      setAi({ status: "suggested" });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not analyze the image.";
      setAi({ status: "failed", message });
    }
  };

  const handlePickedAsset = async (
    asset: ImagePicker.ImagePickerAsset,
  ) => {
    setImageUri(asset.uri);
    const base64 = asset.base64 ?? "";
    const mimeType = asset.mimeType ?? "image/jpeg";
    if (!base64) {
      setAi({ status: "failed", message: "No image data available." });
      return;
    }
    setLastAsset({ base64, mimeType });
    await runAnalysis(base64, mimeType);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
      aspect: [1, 1],
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      await handlePickedAsset(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === "web") {
      pickImage();
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Camera permission needed",
        "Allow camera access to take a photo.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      aspect: [1, 1],
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      await handlePickedAsset(result.assets[0]);
    }
  };

  const onSave = async () => {
    if (!imageUri) {
      Alert.alert("Add a photo", "Please select or take a photo first.");
      return;
    }
    if (!color.trim()) {
      Alert.alert("Add a color", "Please enter the item's color.");
      return;
    }
    setSaving(true);
    try {
      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await addItem({
        imageUri,
        category,
        color: color.trim(),
        tags,
      });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (e) {
      Alert.alert("Could not save", "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 120,
        }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <Pressable
          onPress={pickImage}
          disabled={ai.status === "analyzing"}
          style={({ pressed }) => [
            styles.imageBox,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          {imageUri ? (
            <>
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                contentFit="cover"
              />
              {ai.status === "analyzing" ? (
                <View style={styles.imageOverlay}>
                  <ActivityIndicator color="#ffffff" />
                  <Text style={styles.overlayText}>Analyzing image…</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="image" size={32} color={colors.mutedForeground} />
              <Text
                style={[styles.placeholderText, { color: colors.mutedForeground }]}
              >
                Tap to choose photo
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={pickImage}
            disabled={ai.status === "analyzing"}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed || ai.status === "analyzing" ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="image" size={16} color={colors.foreground} />
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>
              Library
            </Text>
          </Pressable>
          <Pressable
            onPress={takePhoto}
            disabled={ai.status === "analyzing"}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed || ai.status === "analyzing" ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="camera" size={16} color={colors.foreground} />
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>
              Camera
            </Text>
          </Pressable>
        </View>

        <AiBanner
          state={ai}
          onRetry={() =>
            lastAsset && runAnalysis(lastAsset.base64, lastAsset.mimeType)
          }
        />

        <Section label="Category">
          <CategoryPicker value={category} onChange={setCategory} />
        </Section>

        <Section label="Color">
          <TextInput
            value={color}
            onChangeText={setColor}
            placeholder="e.g. Charcoal, Cream, Navy"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
          />
        </Section>

        <Section label="Tags (optional)">
          <TextInput
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="e.g. summer, casual, linen"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
          />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Separate tags with commas.
          </Text>
        </Section>
      </KeyboardAwareScrollViewCompat>

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
          disabled={saving || ai.status === "analyzing"}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: colors.primary,
              opacity:
                saving || ai.status === "analyzing"
                  ? 0.6
                  : pressed
                    ? 0.85
                    : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text
              style={[
                styles.saveLabel,
                { color: colors.primaryForeground },
              ]}
            >
              Save Item
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function AiBanner({
  state,
  onRetry,
}: {
  state: AiState;
  onRetry: () => void;
}) {
  const colors = useColors();
  if (state.status === "idle") return null;

  if (state.status === "analyzing") {
    return (
      <View
        style={[
          styles.banner,
          { backgroundColor: colors.accent, borderColor: colors.border },
        ]}
      >
        <ActivityIndicator size="small" color={colors.accentForeground} />
        <Text
          style={[styles.bannerText, { color: colors.accentForeground }]}
        >
          Analyzing image…
        </Text>
      </View>
    );
  }

  if (state.status === "suggested") {
    return (
      <View
        style={[
          styles.banner,
          { backgroundColor: colors.accent, borderColor: colors.border },
        ]}
      >
        <Feather name="zap" size={14} color={colors.accentForeground} />
        <Text
          style={[styles.bannerText, { color: colors.accentForeground }]}
        >
          AI suggested these details. Edit any field before saving.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.secondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Feather name="alert-circle" size={14} color={colors.mutedForeground} />
      <Text style={[styles.bannerText, { color: colors.mutedForeground }]}>
        Couldn’t analyze automatically. Fill the fields below.
      </Text>
      <Pressable
        onPress={onRetry}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={[styles.bannerLink, { color: colors.primary }]}>
          Retry
        </Text>
      </Pressable>
    </View>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  imageBox: {
    aspectRatio: 1,
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  image: { width: "100%", height: "100%" },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  overlayText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  banner: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  bannerLink: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
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
