import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  DIRTY_THRESHOLD_DEFAULT,
  DIRTY_THRESHOLD_MAX,
  DIRTY_THRESHOLD_MIN,
} from "@/types";

interface Props {
  visible: boolean;
  initialThreshold: number | null;
  required: boolean;
  onClose?: () => void;
  onSave: (dirtyThreshold: number) => void;
}

export function PreferencesModal({
  visible,
  initialThreshold,
  required,
  onClose,
  onSave,
}: Props) {
  const colors = useColors();
  const [threshold, setThreshold] = useState<number>(
    initialThreshold ?? DIRTY_THRESHOLD_DEFAULT,
  );

  useEffect(() => {
    if (visible) setThreshold(initialThreshold ?? DIRTY_THRESHOLD_DEFAULT);
  }, [visible, initialThreshold]);

  const options = Array.from(
    { length: DIRTY_THRESHOLD_MAX - DIRTY_THRESHOLD_MIN + 1 },
    (_, i) => i + DIRTY_THRESHOLD_MIN,
  );

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
            How many wears before your clothes need washing?
          </Text>

          <View style={styles.list}>
            {options.map((n) => {
              const active = n === threshold;
              return (
                <Pressable
                  key={n}
                  onPress={() => setThreshold(n)}
                  style={({ pressed }) => [
                    styles.row,
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
                      styles.rowText,
                      {
                        color: active
                          ? colors.primaryForeground
                          : colors.foreground,
                      },
                    ]}
                  >
                    After {n} {n === 1 ? "wear" : "wears"}
                  </Text>
                  {active ? (
                    <Feather name="check" size={16} color={colors.background} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => onSave(threshold)}
            style={({ pressed }) => [
              styles.primary,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[styles.primaryLabel, { color: colors.primaryForeground }]}
            >
              Save
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
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  list: {
    marginTop: 18,
    gap: 8,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  primary: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
