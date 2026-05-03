import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarRenderer } from "@/components/AvatarRenderer";
import { useAvatar } from "@/contexts/AvatarContext";
import { useColors } from "@/hooks/useColors";

export default function AvatarPreviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { avatar, updateAvatar } = useAvatar();

  const config        = avatar.avatar_config;
  const thumbnailUrl  = avatar.avatar_thumbnail_url;
  const provider      = avatar.avatar_provider;
  const isPhotoreal   = provider === "avatarsdk" && !!thumbnailUrl;

  const handleConfirm = async () => {
    await updateAvatar({ avatar_status: "confirmed" });
    router.dismiss(2);
  };

  const handleAdjust = () => {
    router.back();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 12, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Your avatar is ready
        </Text>
        {isPhotoreal && (
          <View style={styles.providerBadge}>
            <Feather name="zap" size={11} color={colors.primary} />
            <Text style={[styles.providerText, { color: colors.primary }]}>
              Photoreal · Avatar SDK
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View
          style={[styles.avatarStage, { backgroundColor: colors.secondary }]}
        >
          {isPhotoreal ? (
            /* ── Photoreal thumbnail (Avatar SDK) ── */
            <Image
              source={{ uri: thumbnailUrl! }}
              style={styles.thumbnail}
              contentFit="contain"
              transition={300}
            />
          ) : config ? (
            /* ── SVG mannequin fallback ── */
            <>
              <AvatarRenderer config={config} size={220} />
              {provider === "demo" && (
                <View style={[styles.demoChip, { backgroundColor: colors.muted }]}>
                  <Feather name="info" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.demoChipText, { color: colors.mutedForeground }]}>
                    Using simplified avatar preview
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={64} color={colors.mutedForeground} />
            </View>
          )}
        </View>

        <View style={styles.summaryRow}>
          {config && (
            <>
              {avatar.skin_tone ? (
                <SummaryChip label={avatar.skin_tone} icon="droplet" colors={colors} />
              ) : null}
              {avatar.face_shape ? (
                <SummaryChip label={avatar.face_shape} icon="smile" colors={colors} />
              ) : null}
              {avatar.undertone ? (
                <SummaryChip label={`${avatar.undertone} tone`} icon="sun" colors={colors} />
              ) : null}
            </>
          )}
        </View>

        <Text style={[styles.trustCopy, { color: colors.mutedForeground }]}>
          {isPhotoreal
            ? "This is a photorealistic avatar generated from your photo. No facial data is stored permanently."
            : "This is a stylized avatar based on your body measurements. You can update or delete it anytime."}
        </Text>

        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [
            styles.ctaPrimary,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="check" size={18} color={colors.primaryForeground} />
          <Text style={[styles.ctaPrimaryText, { color: colors.primaryForeground }]}>
            Looks good
          </Text>
        </Pressable>

        <Pressable
          onPress={handleAdjust}
          style={({ pressed }) => [
            styles.ctaSecondary,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.ctaSecondaryText, { color: colors.foreground }]}>
            Adjust details
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SummaryChip({
  label,
  icon,
  colors,
}: {
  label: string;
  icon: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Feather name={icon as any} size={12} color={colors.mutedForeground} />
      <Text style={[styles.chipText, { color: colors.foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  providerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  providerText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    alignItems: "center",
    gap: 20,
  },
  avatarStage: {
    width: "100%",
    borderRadius: 24,
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 340,
    gap: 16,
  },
  thumbnail: {
    width: 220,
    height: 320,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: 140,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  demoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  demoChipText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  trustCopy: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  ctaPrimary: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
  },
  ctaPrimaryText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  ctaSecondary: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  ctaSecondaryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
