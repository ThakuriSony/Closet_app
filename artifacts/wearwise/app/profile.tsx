import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
                      ? colors.foreground
                      : colors.background,
                    borderColor: active ? colors.foreground : colors.border,
                    opacity: pressed || busy ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rowText,
                    {
                      color: active ? colors.background : colors.foreground,
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
});
