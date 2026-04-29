import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  const { name, dirtyThreshold, hasDirtyThreshold, setDirtyThreshold } =
    useProfile();
  const [saving, setSaving] = useState<number | null>(null);

  const options = Array.from(
    { length: DIRTY_THRESHOLD_MAX - DIRTY_THRESHOLD_MIN + 1 },
    (_, i) => i + DIRTY_THRESHOLD_MIN,
  );

  const onPick = async (n: number) => {
    if (n === dirtyThreshold && hasDirtyThreshold) return;
    setSaving(n);
    try {
      await setDirtyThreshold(n);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setSaving(null);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: H_PADDING,
        paddingTop: 8,
        paddingBottom: insets.bottom + 24,
      }}
    >
      {name ? (
        <Text style={[styles.name, { color: colors.foreground }]}>
          {name}
        </Text>
      ) : null}

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
            return (
              <Pressable
                key={n}
                onPress={() => onPick(n)}
                disabled={saving !== null}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: active
                      ? colors.foreground
                      : colors.background,
                    borderColor: active ? colors.foreground : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rowText,
                    {
                      color: active
                        ? colors.background
                        : colors.foreground,
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  name: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 18,
  },
  section: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
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
  helper: {
    marginTop: 14,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
