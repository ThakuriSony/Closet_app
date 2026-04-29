import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  DIRTY_THRESHOLD_DEFAULT,
  DIRTY_THRESHOLD_MAX,
  DIRTY_THRESHOLD_MIN,
  STYLE_PREFERENCES,
  type StylePreference,
} from "@/types";

interface Props {
  visible: boolean;
  initialStyle: StylePreference | null;
  initialThreshold: number | null;
  required: boolean;
  onClose?: () => void;
  onSave: (input: {
    stylePreference: StylePreference;
    dirtyThreshold: number;
  }) => void;
}

export function PreferencesModal({
  visible,
  initialStyle,
  initialThreshold,
  required,
  onClose,
  onSave,
}: Props) {
  const colors = useColors();
  const [style, setStyle] = useState<StylePreference>(
    initialStyle ?? "Casual",
  );
  const [threshold, setThreshold] = useState<number>(
    initialThreshold ?? DIRTY_THRESHOLD_DEFAULT,
  );

  useEffect(() => {
    if (visible) {
      setStyle(initialStyle ?? "Casual");
      setThreshold(initialThreshold ?? DIRTY_THRESHOLD_DEFAULT);
    }
  }, [visible, initialStyle, initialThreshold]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!required && onClose) onClose();
      }}
    >
      <View style={styles.backdrop}>
        {!required && onClose ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        ) : null}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            Quick setup
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            Tell us a bit about your style so outfit suggestions feel right.
          </Text>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Style preference
          </Text>
          <View style={styles.chipRow}>
            {STYLE_PREFERENCES.map((opt) => {
              const active = opt === style;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setStyle(opt)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: active
                        ? colors.foreground
                        : colors.card,
                      borderColor: active ? colors.foreground : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: active
                          ? colors.background
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Wears before laundry
          </Text>
          <Text
            style={[styles.helper, { color: colors.mutedForeground }]}
          >
            How many times can you wear an item before it goes in the laundry
            pile?
          </Text>
          <View style={styles.thresholdRow}>
            {Array.from(
              { length: DIRTY_THRESHOLD_MAX - DIRTY_THRESHOLD_MIN + 1 },
              (_, i) => i + DIRTY_THRESHOLD_MIN,
            ).map((n) => {
              const active = n === threshold;
              return (
                <Pressable
                  key={n}
                  onPress={() => setThreshold(n)}
                  style={({ pressed }) => [
                    styles.numChip,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.numLabel,
                      {
                        color: active
                          ? colors.primaryForeground
                          : colors.foreground,
                      },
                    ]}
                  >
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => onSave({ stylePreference: style, dirtyThreshold: threshold })}
            style={({ pressed }) => [
              styles.primary,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather
              name="check"
              size={16}
              color={colors.primaryForeground}
            />
            <Text
              style={[styles.primaryLabel, { color: colors.primaryForeground }]}
            >
              Save preferences
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  body: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  label: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  helper: {
    marginTop: -4,
    marginBottom: 8,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  thresholdRow: {
    flexDirection: "row",
    gap: 8,
  },
  numChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  numLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  primary: {
    marginTop: 22,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
