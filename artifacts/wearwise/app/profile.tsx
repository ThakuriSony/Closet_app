import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
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

import { AvatarRenderer } from "@/components/AvatarRenderer";
import { useAvatar } from "@/contexts/AvatarContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useColors } from "@/hooks/useColors";
import {
  DIRTY_THRESHOLD_MAX,
  DIRTY_THRESHOLD_MIN,
} from "@/types";

const H_PADDING = 20;

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
  const { avatar, clearFacePhoto } = useAvatar();

  const [nameDraft, setNameDraft] = useState<string>(name ?? "");
  const [pickingThreshold, setPickingThreshold] = useState<number | null>(
    null,
  );
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
      <Text style={[styles.section, { color: colors.mutedForeground }]}>
        Profile
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
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
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
        />
        {dirty ? (
          <Pressable
            onPress={onSaveName}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather
              name="check"
              size={14}
              color={colors.primaryForeground}
            />
            <Text
              style={[
                styles.saveLabel,
                { color: colors.primaryForeground },
              ]}
            >
              Save name
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>
        Laundry Settings
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.label, { color: colors.foreground }]}>
          Laundry Sensitivity
        </Text>
        <Text style={[styles.value, { color: colors.mutedForeground }]}>
          {hasDirtyThreshold
            ? `After ${dirtyThreshold} ${dirtyThreshold === 1 ? "wear" : "wears"}`
            : "Not set"}
        </Text>

        <View style={styles.optionList}>
          {options.map((n) => {
            const active = hasDirtyThreshold && n === dirtyThreshold;
            const busy = pickingThreshold === n;
            return (
              <Pressable
                key={n}
                onPress={() => onPickThreshold(n)}
                disabled={pickingThreshold !== null}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : colors.background,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed || busy ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rowText,
                    {
                      color: active ? colors.primaryForeground : colors.foreground,
                    },
                  ]}
                >
                  After {n} {n === 1 ? "wear" : "wears"}
                </Text>
                {active ? (
                  <Feather
                    name="check"
                    size={16}
                    color={colors.background}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.helper, { color: colors.mutedForeground }]}>
          Items move to the laundry pile automatically once they reach this
          number of wears.
        </Text>
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>
        My Avatar
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Avatar mini-preview */}
        {(avatar.avatar_status === "confirmed" || avatar.avatar_status === "setup_complete") && (
          <View style={styles.avatarPreviewRow}>
            <View style={[styles.avatarThumbWrap, { backgroundColor: colors.secondary }]}>
              {avatar.avatar_provider === "avatarsdk" && avatar.avatar_thumbnail_url ? (
                <Image
                  source={{ uri: avatar.avatar_thumbnail_url }}
                  style={styles.avatarThumbImg}
                  contentFit="contain"
                />
              ) : avatar.avatar_config ? (
                <AvatarRenderer config={avatar.avatar_config} size={64} />
              ) : (
                <Feather name="user" size={28} color={colors.mutedForeground} />
              )}
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Virtual Avatar
              </Text>
              <Text style={[styles.value, { color: colors.mutedForeground }]}>
                {avatar.avatar_status === "confirmed" ? "Confirmed" : "Ready for review"}
                {avatar.avatar_provider === "avatarsdk" ? " · Photoreal" : " · Stylized"}
              </Text>
              {avatar.skin_tone || avatar.face_shape ? (
                <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                  {[avatar.skin_tone, avatar.face_shape].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {!(avatar.avatar_status === "confirmed" || avatar.avatar_status === "setup_complete") && (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Virtual Avatar
            </Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Optional. Helps visualize how outfits fit your body.
            </Text>
          </>
        )}

        <Pressable
          onPress={() => router.push("/avatar-setup")}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
              marginTop: 14,
            },
          ]}
        >
          <Feather
            name={avatar.avatar_status !== "not_started" ? "edit-2" : "user"}
            size={14}
            color={colors.primaryForeground}
          />
          <Text style={[styles.saveLabel, { color: colors.primaryForeground }]}>
            {avatar.avatar_status !== "not_started"
              ? "Edit avatar"
              : "Create my avatar"}
          </Text>
        </Pressable>

        {avatar.avatar_status !== "not_started" && avatar.face_photo_url ? (
          <Pressable
            onPress={() => void clearFacePhoto()}
            style={({ pressed }) => [
              styles.deletePhotoBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="trash-2" size={13} color={colors.mutedForeground} />
            <Text style={[styles.deletePhotoText, { color: colors.mutedForeground }]}>
              Delete face photo
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>
        App Preferences
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Notifications
            </Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Daily wardrobe nudges, weather heads-ups, and event reminders.
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={(v) => {
              void setNotificationsEnabled(v);
            }}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={
              Platform.OS === "android" ? colors.background : undefined
            }
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
  label: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  value: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  helper: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
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
  saveLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  optionList: {
    marginTop: 16,
    gap: 8,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deletePhotoBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  deletePhotoText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  avatarPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  avatarThumbWrap: {
    width: 72,
    height: 96,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarThumbImg: {
    width: 72,
    height: 96,
  },
});
