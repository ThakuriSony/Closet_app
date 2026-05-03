import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStyleProfile } from "@/contexts/StyleProfileContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useColors } from "@/hooks/useColors";
import { getStyleInsights } from "@/services/styleInsightEngine";
import {
  DIRTY_THRESHOLD_MAX,
  DIRTY_THRESHOLD_MIN,
} from "@/types";

const H_PADDING = 20;

// ---------------------------------------------------------------------------
// Profile summary pill
// ---------------------------------------------------------------------------

function ProfileSummaryRow({ label, value, colors }: {
  label: string;
  value: string | null;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  if (!value) return null;
  return (
    <View style={summaryStyles.row}>
      <Text style={[summaryStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[summaryStyles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  value: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});

// ---------------------------------------------------------------------------
// Insights panel (expanded, non-collapsible for profile)
// ---------------------------------------------------------------------------

function InsightBullet({ text, colors }: {
  text: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={insightStyles.bullet}>
      <View style={[insightStyles.dot, { backgroundColor: colors.primary }]} />
      <Text style={[insightStyles.text, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

const insightStyles = StyleSheet.create({
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  text: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    name,
    setName,
    dirtyThreshold,
    hasDirtyThreshold,
    setDirtyThreshold,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useProfile();
  const { profile } = useStyleProfile();

  const [nameDraft, setNameDraft] = useState<string>(name ?? "");
  const [pickingThreshold, setPickingThreshold] = useState<number | null>(null);
  const initialName = useRef(name);

  useEffect(() => {
    setNameDraft(name ?? "");
    initialName.current = name;
  }, [name]);

  const onSaveName = async () => {
    const trimmed = nameDraft.trim();
    const value = trimmed.length > 0 ? trimmed : null;
    if (value === initialName.current) return;
    await setName(value);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const options = Array.from(
    { length: DIRTY_THRESHOLD_MAX - DIRTY_THRESHOLD_MIN + 1 },
    (_, i) => i + DIRTY_THRESHOLD_MIN,
  );

  const onPickThreshold = async (n: number) => {
    if (n === dirtyThreshold && hasDirtyThreshold) return;
    setPickingThreshold(n);
    try {
      await setDirtyThreshold(n);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setPickingThreshold(null);
    }
  };

  const dirty = nameDraft.trim() !== (name ?? "");

  // ── Styling insights ──────────────────────────────────────────────────────
  const insights = getStyleInsights(profile);

  // ── Height display ────────────────────────────────────────────────────────
  const heightDisplay = (() => {
    if (profile.height_value === null) return null;
    if (profile.height_unit === "cm") return `${profile.height_value} cm`;
    // ft encoding: index → ft' in"
    const idx = profile.height_value;
    const ft  = 4 + Math.floor(idx / 12);
    const inch = idx % 12;
    return `${ft}' ${inch}"`;
  })();

  const weightDisplay = (() => {
    if (profile.weight_value === null) return null;
    return `${profile.weight_value} ${profile.weight_unit}`;
  })();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: H_PADDING,
        paddingTop: 12,
        paddingBottom: insets.bottom + 24,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* ─── Profile name ─────────────────────────────────────────── */}
      <Text style={[styles.section, { color: colors.mutedForeground }]}>Profile</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          What should we call you?
        </Text>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>
          Used for your daily greeting on the Home screen.
        </Text>
        <TextInput
          value={nameDraft}
          onChangeText={setNameDraft}
          placeholder="Your name"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="done"
          onSubmitEditing={onSaveName}
          onBlur={onSaveName}
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
        />
        {dirty ? (
          <Pressable
            onPress={onSaveName}
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="check" size={14} color={colors.primaryForeground} />
            <Text style={[styles.saveLabel, { color: colors.primaryForeground }]}>Save name</Text>
          </Pressable>
        ) : null}
      </View>

      {/* ─── Laundry settings ─────────────────────────────────────── */}
      <Text style={[styles.section, { color: colors.mutedForeground }]}>Laundry Settings</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.foreground }]}>Laundry Sensitivity</Text>
        <Text style={[styles.value, { color: colors.mutedForeground }]}>
          {hasDirtyThreshold
            ? `After ${dirtyThreshold} ${dirtyThreshold === 1 ? "wear" : "wears"}`
            : "Not set"}
        </Text>

        <View style={styles.optionList}>
          {options.map((n) => {
            const active = hasDirtyThreshold && n === dirtyThreshold;
            const busy   = pickingThreshold === n;
            return (
              <Pressable
                key={n}
                onPress={() => onPickThreshold(n)}
                disabled={pickingThreshold !== null}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: active ? colors.primary : colors.background,
                    borderColor:     active ? colors.primary : colors.border,
                    opacity: pressed || busy ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.rowText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                  After {n} {n === 1 ? "wear" : "wears"}
                </Text>
                {active ? <Feather name="check" size={16} color={colors.background} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.helper, { color: colors.mutedForeground }]}>
          Items move to the laundry pile automatically once they reach this number of wears.
        </Text>
      </View>

      {/* ─── My Style Profile ─────────────────────────────────────── */}
      <Text style={[styles.section, { color: colors.mutedForeground }]}>My Style Profile</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {profile.is_complete ? (
          <View style={styles.profileSummary}>
            <ProfileSummaryRow label="Height"     value={heightDisplay}       colors={colors} />
            <ProfileSummaryRow label="Weight"     value={weightDisplay}       colors={colors} />
            <ProfileSummaryRow label="Face shape" value={profile.face_shape}  colors={colors} />
            <ProfileSummaryRow label="Skin tone"  value={profile.skin_tone}   colors={colors} />
            <ProfileSummaryRow label="Undertone"  value={profile.undertone}   colors={colors} />
          </View>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Style Profile
            </Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Add your measurements and features to unlock personalised style suggestions.
            </Text>
          </>
        )}

        <Pressable
          onPress={() => router.push("/style-profile")}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, marginTop: 14 },
          ]}
        >
          <Feather name={profile.is_complete ? "edit-2" : "user"} size={14} color={colors.primaryForeground} />
          <Text style={[styles.saveLabel, { color: colors.primaryForeground }]}>
            {profile.is_complete ? "Edit style profile" : "Set up style profile"}
          </Text>
        </Pressable>
      </View>

      {/* ─── What looks good on you ───────────────────────────────── */}
      {insights.hasData && (
        <>
          <Text style={[styles.section, { color: colors.mutedForeground }]}>
            What looks good on you
          </Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Colours */}
            {insights.color.length > 0 && (
              <View style={styles.insightGroup}>
                <View style={styles.insightGroupHeader}>
                  <Feather name="droplet" size={12} color={colors.primary} />
                  <Text style={[styles.insightGroupLabel, { color: colors.primary }]}>Colours</Text>
                </View>
                {insights.color.map((b, i) => <InsightBullet key={i} text={b} colors={colors} />)}
              </View>
            )}

            {/* Silhouette */}
            {insights.silhouette.length > 0 && (
              <View style={styles.insightGroup}>
                <View style={styles.insightGroupHeader}>
                  <Feather name="layers" size={12} color={colors.primary} />
                  <Text style={[styles.insightGroupLabel, { color: colors.primary }]}>Silhouette</Text>
                </View>
                {insights.silhouette.map((b, i) => <InsightBullet key={i} text={b} colors={colors} />)}
              </View>
            )}

            {/* Lengths */}
            {insights.length.length > 0 && (
              <View style={styles.insightGroup}>
                <View style={styles.insightGroupHeader}>
                  <Feather name="arrow-down" size={12} color={colors.primary} />
                  <Text style={[styles.insightGroupLabel, { color: colors.primary }]}>Lengths</Text>
                </View>
                {insights.length.map((b, i) => <InsightBullet key={i} text={b} colors={colors} />)}
              </View>
            )}

            <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
              These are style suggestions, not rules. Wear what makes you feel good.
            </Text>
          </View>
        </>
      )}

      {/* ─── App preferences ──────────────────────────────────────── */}
      <Text style={[styles.section, { color: colors.mutedForeground }]}>App Preferences</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.foreground }]}>Notifications</Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Daily wardrobe nudges, weather heads-ups, and event reminders.
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={(v) => { void setNotificationsEnabled(v); }}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={Platform.OS === "android" ? colors.background : undefined}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 18,
  },
  label: { fontSize: 16, fontFamily: "Inter_700Bold" },
  value: { marginTop: 4, fontSize: 13, fontFamily: "Inter_500Medium" },
  helper: { marginTop: 6, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  input: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  saveBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  saveLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  optionList: { marginTop: 16, gap: 8 },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileSummary: { gap: 2 },
  insightGroup: { gap: 6, marginBottom: 4 },
  insightGroupHeader: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  insightGroupLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  disclaimer: {
    marginTop: 10,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 16,
  },
});
